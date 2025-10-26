const fs = require('fs').promises;
const path = require('path');

/**
 * Job Queue for background file processing that survives pod restarts
 * Stores job state in local_cache directory as JSON files
 */
class PersistentJobQueue {
  constructor() {
    this.jobsDir = path.join(process.cwd(), 'local_cache', 'jobs');
    this.isProcessing = false;
    this.currentJob = null;
    
    // Ensure jobs directory exists
    this.initializeJobsDirectory();
    
    // Start processing on startup
    this.startProcessing();
  }

  async initializeJobsDirectory() {
    try {
      await fs.mkdir(this.jobsDir, { recursive: true });
      console.log('📁 Job queue directory initialized:', this.jobsDir);
    } catch (error) {
      console.error('❌ Failed to create jobs directory:', error);
    }
  }

  /**
   * Add a new material processing job
   */
  async addMaterialProcessingJob(materialId, materialData) {
    const jobId = `material_${materialId}_${Date.now()}`;
    const job = {
      id: jobId,
      type: 'material_processing',
      materialId,
      materialData: {
        name: materialData.name,
        path: materialData.path,
        type: materialData.type,
        _id: materialData._id
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    };

    try {
      const jobFile = path.join(this.jobsDir, `${jobId}.json`);
      await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
      console.log(`📝 Added job to queue: ${jobId} for material: ${materialData.name}`);
      
      // Trigger processing if not already running
      if (!this.isProcessing) {
        setImmediate(() => this.processNextJob());
      }
      
      return jobId;
    } catch (error) {
      console.error('❌ Failed to add job to queue:', error);
      throw error;
    }
  }

  /**
   * Get all pending jobs on startup
   */
  async getPendingJobs() {
    try {
      const files = await fs.readdir(this.jobsDir);
      const jobs = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const jobData = await fs.readFile(path.join(this.jobsDir, file), 'utf-8');
            const job = JSON.parse(jobData);
            if (job.status === 'pending' || job.status === 'processing') {
              // Reset processing jobs to pending on startup (pod restart)
              if (job.status === 'processing') {
                job.status = 'pending';
                await this.updateJobStatus(job.id, 'pending');
              }
              jobs.push(job);
            }
          } catch (error) {
            console.error(`❌ Failed to read job file ${file}:`, error);
          }
        }
      }
      
      // Sort by creation time
      jobs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return jobs;
    } catch (error) {
      console.error('❌ Failed to get pending jobs:', error);
      return [];
    }
  }

  /**
   * Update job status
   */
  async updateJobStatus(jobId, status, error = null) {
    try {
      const jobFile = path.join(this.jobsDir, `${jobId}.json`);
      const jobData = await fs.readFile(jobFile, 'utf-8');
      const job = JSON.parse(jobData);
      
      job.status = status;
      job.updatedAt = new Date().toISOString();
      
      if (error) {
        job.error = error;
        job.attempts = (job.attempts || 0) + 1;
      }
      
      await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
      console.log(`📊 Updated job ${jobId} status: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update job status for ${jobId}:`, error);
    }
  }

  /**
   * Start processing jobs continuously
   */
  async startProcessing() {
    console.log('🚀 Starting persistent job queue processing...');
    
    // Process any pending jobs from previous pod lifecycle
    const pendingJobs = await this.getPendingJobs();
    if (pendingJobs.length > 0) {
      console.log(`📋 Found ${pendingJobs.length} pending jobs from previous session`);
    }
    
    // Start the processing loop
    this.processNextJob();
  }

  /**
   * Process the next job in the queue
   */
  async processNextJob() {
    if (this.isProcessing) {
      return; // Already processing
    }

    try {
      this.isProcessing = true;
      const pendingJobs = await this.getPendingJobs();
      
      if (pendingJobs.length === 0) {
        this.isProcessing = false;
        // Check again in 5 seconds
        setTimeout(() => this.processNextJob(), 5000);
        return;
      }

      const job = pendingJobs[0];
      this.currentJob = job;
      console.log(`🔄 Processing job: ${job.id} for material: ${job.materialData.name}`);
      
      await this.updateJobStatus(job.id, 'processing');

      try {
        await this.processJob(job);
        await this.updateJobStatus(job.id, 'completed');
        await this.deleteJobFile(job.id);
        console.log(`✅ Completed job: ${job.id}`);
      } catch (error) {
        console.error(`❌ Job failed: ${job.id}`, error);
        
        if (job.attempts >= job.maxAttempts) {
          await this.updateJobStatus(job.id, 'failed', error.message);
          console.error(`💀 Job failed permanently after ${job.maxAttempts} attempts: ${job.id}`);
        } else {
          await this.updateJobStatus(job.id, 'pending', error.message);
          console.log(`🔄 Job will be retried: ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`);
        }
      }

      this.currentJob = null;
      this.isProcessing = false;
      
      // Process next job
      setImmediate(() => this.processNextJob());
      
    } catch (error) {
      console.error('❌ Error in job processing loop:', error);
      this.isProcessing = false;
      this.currentJob = null;
      
      // Retry after delay
      setTimeout(() => this.processNextJob(), 10000);
    }
  }

  /**
   * Process a specific job
   */
  async processJob(job) {
    if (job.type === 'material_processing') {
      await this.processMaterialJob(job);
    } else {
      throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Process material embedding job
   */
  async processMaterialJob(job) {
    const { materialId, materialData } = job;
    
    try {
      // Import Material model and RAG service
      const Material = (await import('../models/Material.js')).default;
      const ragService = (await import('./ragService.js')).default;

      // Get current material from database
      const material = await Material.findById(materialId);
      if (!material) {
        throw new Error(`Material not found: ${materialId}`);
      }

      console.log(`🔄 Chunking and embedding material: ${material.name}`);
      const result = await ragService.processAndEmbedMaterial(material);

      if (result.success) {
        await material.markAsCompleted();
        console.log(`✅ Material processed and embedded: ${material.name}`);
        console.log(`📊 Created ${result.chunksCount} chunks`);
      } else {
        await material.markAsFailed(result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`❌ Material processing failed: ${materialData.name}`, error);
      throw error;
    }
  }

  /**
   * Delete completed job file
   */
  async deleteJobFile(jobId) {
    try {
      const jobFile = path.join(this.jobsDir, `${jobId}.json`);
      await fs.unlink(jobFile);
    } catch (error) {
      console.error(`❌ Failed to delete job file ${jobId}:`, error);
    }
  }

  /**
   * Get current processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        type: this.currentJob.type,
        materialName: this.currentJob.materialData?.name
      } : null
    };
  }

  /**
   * Graceful shutdown - finish current job
   */
  async shutdown() {
    console.log('🛑 Shutting down job queue gracefully...');
    
    if (this.currentJob) {
      console.log(`⏳ Waiting for current job to complete: ${this.currentJob.id}`);
      // Reset current job to pending so it can be picked up on restart
      await this.updateJobStatus(this.currentJob.id, 'pending');
    }
    
    this.isProcessing = false;
    console.log('✅ Job queue shutdown complete');
  }
}

// Export singleton instance
const jobQueue = new PersistentJobQueue();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📡 Received SIGTERM signal');
  await jobQueue.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 Received SIGINT signal');
  await jobQueue.shutdown();
  process.exit(0);
});

module.exports = jobQueue;