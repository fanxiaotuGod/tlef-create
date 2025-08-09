import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Wand2, Settings, Zap, Gamepad2, GraduationCap, CheckCircle, Edit, Plus, Minus, X } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { generatePlan, fetchPlans, approvePlan, setCurrentPlan } from '../store/slices/planSlice';
import { questionsApi, Question } from '../services/api';
import { usePubSub } from '../hooks/usePubSub';
import '../styles/components/QuestionGeneration.css';

interface QuestionGenerationProps {
  learningObjectives: string[];
  assignedMaterials: string[];
  quizId: string;
  onQuestionsGenerated?: () => void;
}

type PedagogicalApproach = 'support' | 'assess' | 'gamify' | 'custom';

interface QuestionTypeConfig {
  type: string;
  count: number;
  percentage: number;
  scope: 'per-lo' | 'whole-quiz'; // New: scope for each question type
  editMode: 'count' | 'percentage'; // New: editing mode
}

interface CustomFormula {
  questionTypes: QuestionTypeConfig[];
  totalQuestions: number;
  totalPerLO: number; // Questions per LO
  totalWholeQuiz: number; // Additional questions for whole quiz
}

const QuestionGeneration = ({ learningObjectives, assignedMaterials, quizId, onQuestionsGenerated }: QuestionGenerationProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentPlan, activePlan, loading, generating, error } = useSelector((state: RootState) => state.plan);
  const { showNotification } = usePubSub('QuestionGeneration');
  
  // Question generation state management
  const [approach, setApproach] = useState<PedagogicalApproach>('support');
  const [questionsPerLO, setQuestionsPerLO] = useState(3);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
  const [isUserEditingApproach, setIsUserEditingApproach] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [hasExistingQuestions, setHasExistingQuestions] = useState(false);
  const [customFormula, setCustomFormula] = useState<CustomFormula>(() => {
    // Initialize with default support approach distribution
    return {
      questionTypes: [
        { type: 'multiple-choice', count: 1, percentage: 40, scope: 'per-lo', editMode: 'count' },
        { type: 'true-false', count: 1, percentage: 20, scope: 'per-lo', editMode: 'count' },
        { type: 'flashcard', count: 1, percentage: 30, scope: 'per-lo', editMode: 'count' },
        { type: 'summary', count: 0, percentage: 10, scope: 'per-lo', editMode: 'count' }
      ],
      totalQuestions: 3,
      totalPerLO: 3,
      totalWholeQuiz: 0
    };
  });

  // Load existing plans and restore quiz-specific settings when component mounts
  useEffect(() => {
    if (quizId) {
      dispatch(fetchPlans(quizId));
      // Restore quiz-specific settings from localStorage
      restoreQuizSettings(quizId);
      // Load existing questions if any
      loadExistingQuestions(quizId);
    }
  }, [quizId, dispatch]);

  // Load existing questions for the quiz
  const loadExistingQuestions = async (quizId: string) => {
    try {
      const result = await questionsApi.getQuestions(quizId);
      if (result.questions.length > 0) {
        console.log('📝 Loaded existing questions:', result.questions.length);
        setQuestions(result.questions);
        setHasExistingQuestions(true);
        // Questions loaded successfully
      } else {
        setHasExistingQuestions(false);
      }
    } catch (error) {
      console.error('Failed to load existing questions:', error);
      setHasExistingQuestions(false);
    }
  };

  // Save quiz-specific settings to localStorage
  const saveQuizSettings = (quizId: string) => {
    const settings = {
      approach,
      questionsPerLO,
      showAdvancedEdit,
      customFormula,
      timestamp: Date.now()
    };
    localStorage.setItem(`quiz-settings-${quizId}`, JSON.stringify(settings));
    console.log('💾 Saved quiz settings for:', quizId, settings);
  };


  // Helper function for prompt analysis
  const getPromptAnalysis = () => {
    const methodUsage = questions.reduce((acc, question) => {
      const metadata = question.generationMetadata;
      const method = metadata?.generationMethod || 'template-based';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const promptsByLO = learningObjectives.map((lo) => {
      const loQuestions = questions.filter(q => {
        const loText = typeof q.learningObjective === 'string' ? q.learningObjective : (q.learningObjective as any)?.text;
        return loText === lo;
      });
      
      return {
        objective: lo.substring(0, 50) + (lo.length > 50 ? '...' : ''),
        questionCount: loQuestions.length,
        prompts: loQuestions.map(q => ({
          questionNumber: q.order + 1,
          type: q.type,
          prompt: q.generationMetadata?.generationPrompt || `Generate ${q.type} question for: ${lo}`,
          subObjective: q.generationMetadata?.subObjective || 'General knowledge application',
          focusArea: q.generationMetadata?.focusArea || 'general knowledge',
          complexity: q.generationMetadata?.complexity || 'medium',
          method: q.generationMetadata?.generationMethod || 'template-based'
        }))
      };
    });

    return { methodUsage, promptsByLO };
  };

  // Restore quiz-specific settings from localStorage
  const restoreQuizSettings = (quizId: string) => {
    try {
      const saved = localStorage.getItem(`quiz-settings-${quizId}`);
      if (saved) {
        const settings = JSON.parse(saved);
        console.log('🔄 Restoring quiz settings from localStorage for:', quizId, settings);
        
        // Only restore if settings are recent (within 24 hours)
        const isRecent = Date.now() - settings.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent) {
          // Set a flag to prevent the restoration from being overridden immediately
          setIsUserEditingApproach(true);
          
          setApproach(settings.approach || 'support');
          setQuestionsPerLO(settings.questionsPerLO || 3);
          setShowAdvancedEdit(settings.showAdvancedEdit || false);
          if (settings.customFormula) {
            setCustomFormula(settings.customFormula);
          }
          
          // Reset the flag after restoration is complete
          setTimeout(() => setIsUserEditingApproach(false), 200);
        }
      }
    } catch (error) {
      console.error('Failed to restore quiz settings:', error);
    }
  };

  // Restore custom formula when currentPlan changes
  // Database plan takes priority over localStorage settings
  useEffect(() => {
    if (currentPlan && currentPlan.customFormula && !isUserEditingApproach) {
      console.log('🔄 Restoring custom formula from database plan:', currentPlan.customFormula);
      setCustomFormula({
        questionTypes: currentPlan.customFormula.questionTypes || [],
        totalQuestions: currentPlan.customFormula.totalQuestions || 3,
        totalPerLO: currentPlan.customFormula.totalPerLO || 3,
        totalWholeQuiz: currentPlan.customFormula.totalWholeQuiz || 0
      });
      
      // Set the approach and questionsPerLO from the plan  
      setApproach(currentPlan.approach);
      setQuestionsPerLO(currentPlan.questionsPerLO);
      
      // Show advanced edit if custom formula exists
      if (currentPlan.customFormula.questionTypes && currentPlan.customFormula.questionTypes.length > 0) {
        setShowAdvancedEdit(true);
      }
      
      // Update localStorage with the plan data to keep them in sync
      saveQuizSettings(quizId);
    } else if (isUserEditingApproach) {
      console.log('⏭️ Skipping plan restoration - user is editing approach');
    }
  }, [currentPlan, isUserEditingApproach, quizId]);


  const pedagogicalApproaches = [
    {
      id: 'support' as PedagogicalApproach,
      title: 'Support Learning',
      description: 'Flashcards and summaries to help students memorize and understand',
      icon: GraduationCap,
    },
    {
      id: 'assess' as PedagogicalApproach,
      title: 'Assess Learning', 
      description: 'Classic assessment questions to test student comprehension',
      icon: Zap,
    },
    {
      id: 'gamify' as PedagogicalApproach,
      title: 'Gamify Learning',
      description: 'Interactive and engaging questions to make learning fun',
      icon: Gamepad2,
    },
    {
      id: 'custom' as PedagogicalApproach,
      title: 'Custom Formula',
      description: 'Define your own mix of question types and quantities',
      icon: Settings,
    }
  ];

  // Plan generation handlers
  const handleGeneratePlan = async () => {
    try {
      const effectiveQuestionsPerLO = approach === 'custom' ? customFormula.totalPerLO : questionsPerLO;
      
      // Prepare the plan generation data
      const planData: any = {
        quizId,
        approach,
        questionsPerLO: effectiveQuestionsPerLO
      };
      
      // Add custom formula for advanced settings
      if (approach === 'custom' || showAdvancedEdit) {
        planData.customFormula = {
          questionTypes: customFormula.questionTypes,
          totalPerLO: customFormula.totalPerLO,
          totalWholeQuiz: customFormula.totalWholeQuiz,
          totalQuestions: (learningObjectives.length * customFormula.totalPerLO) + customFormula.totalWholeQuiz
        };
      }
      
      // Save current settings before generating plan
      saveQuizSettings(quizId);
      
      // Reset user editing flag before generating plan
      setIsUserEditingApproach(false);
      
      await dispatch(generatePlan(planData));
      showNotification('success', 'Plan Generated', 'Generation plan created successfully with your custom settings');
    } catch (error) {
      console.error('Failed to generate plan:', error);
      showNotification('error', 'Plan Generation Failed', 'Failed to generate plan');
    }
  };

  // Delete existing questions before regeneration
  const handleDeleteExistingQuestions = async () => {
    try {
      console.log('🗑️ Deleting existing questions before regeneration...');
      const result = await questionsApi.deleteAllQuestions(quizId);
      console.log(`✅ Deleted ${result.deletedCount} existing questions`);
      
      // Clear local questions state
      setQuestions([]);
      setHasExistingQuestions(false);
      
      return result.deletedCount;
    } catch (error) {
      console.error('Failed to delete existing questions:', error);
      throw error;
    }
  };

  // Reset plan to allow user to change approach and regenerate
  const handleGoBackToPlan = () => {
    // Reset the plan state to show plan generation UI again
    dispatch(setCurrentPlan(null));
    
    // Clear questions to ensure we go back to plan phase
    setQuestions([]);
    setHasExistingQuestions(false);
    
    // Enable user editing mode
    setIsUserEditingApproach(true);
    
    showNotification('info', 'Plan Reset', 'You can now modify your approach and generate a new plan.');
  };

  const handleGenerateQuestions = async (isRegeneration = false) => {
    if (!currentPlan) return;
    
    try {
      setIsRegenerating(isRegeneration);
      
      // Delete existing questions if this is a regeneration
      if (isRegeneration && hasExistingQuestions) {
        await handleDeleteExistingQuestions();
        showNotification('info', 'Questions Deleted', 'Previous questions deleted. Generating new ones...');
      }
      
      // First approve the plan
      await dispatch(approvePlan(currentPlan._id));
      console.log('✅ Plan approved, starting question generation');
      
      // Show generating state while maintaining plan phase
      showNotification('info', 'Generating Questions', 'AI is generating questions based on your plan...');
      
      // Small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call the question generation API
      const result = await questionsApi.generateFromPlan(quizId);
      console.log('🎉 Questions generated successfully:', result);
      
      // Store the generated questions
      setQuestions(result.questions);
      setHasExistingQuestions(result.questions.length > 0);
      
      const message = isRegeneration 
        ? `Successfully regenerated ${result.questions.length} questions with new approach!`
        : `Successfully generated ${result.questions.length} questions!`;
      
      showNotification('success', 'Questions Generated', message);
      
      // Redirect to Review & Edit page after generation
      if (onQuestionsGenerated) {
        // Small delay to allow notification to show
        setTimeout(() => {
          onQuestionsGenerated();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      const errorMessage = isRegeneration 
        ? 'Failed to regenerate questions'
        : 'Failed to generate questions';
      showNotification('error', 'Question Generation Failed', errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };




  // Advanced settings handlers
  const availableQuestionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'true-false', label: 'True/False' },
    { value: 'flashcard', label: 'Flashcard' },
    { value: 'summary', label: 'Summary' },
    { value: 'discussion', label: 'Discussion' },
    { value: 'matching', label: 'Matching' },
    { value: 'ordering', label: 'Ordering' },
    { value: 'cloze', label: 'Fill in the Blank' }
  ];

  const addQuestionType = () => {
    const usedTypes = customFormula.questionTypes.map(qt => qt.type);
    const availableType = availableQuestionTypes.find(qt => !usedTypes.includes(qt.value));
    
    if (availableType) {
      const newQuestionType: QuestionTypeConfig = {
        type: availableType.value,
        count: 1,
        percentage: 0,
        scope: 'per-lo',
        editMode: 'count'
      };
      
      const newTypes = [...customFormula.questionTypes, newQuestionType];
      setCustomFormula(prev => ({ ...prev, questionTypes: newTypes }));
      updateTotals(newTypes);
    }
  };

  const removeQuestionType = (index: number) => {
    const newTypes = customFormula.questionTypes.filter((_, i) => i !== index);
    setCustomFormula(prev => ({ ...prev, questionTypes: newTypes }));
    updateTotals(newTypes);
  };

  const updateQuestionType = (index: number, field: 'type' | 'count' | 'percentage' | 'scope' | 'editMode', value: string | number) => {
    // Create a deep copy to avoid mutating read-only objects
    const newTypes = customFormula.questionTypes.map((qt, i) => {
      if (i !== index) return { ...qt }; // Copy other items as-is
      
      // Create a new object for the item being updated
      const updatedType = { ...qt };
      
      if (field === 'type') {
        updatedType.type = value as string;
      } else if (field === 'count') {
        updatedType.count = Math.max(0, value as number);
        // If editing by count, recalculate percentage will be done in updateTotals
      } else if (field === 'percentage') {
        updatedType.percentage = Math.max(0, Math.min(100, value as number));
        // If editing by percentage, recalculate count
        if (updatedType.editMode === 'percentage') {
          const perLoTypes = customFormula.questionTypes.filter(qt => qt.scope === 'per-lo');
          const totalPerLoPercentage = perLoTypes.reduce((sum, qt) => sum + qt.percentage, 0);
          if (totalPerLoPercentage > 0) {
            updatedType.count = Math.round((updatedType.percentage / 100) * questionsPerLO);
          }
        }
      } else if (field === 'scope') {
        updatedType.scope = value as 'per-lo' | 'whole-quiz';
      } else if (field === 'editMode') {
        updatedType.editMode = value as 'count' | 'percentage';
      }
      
      return updatedType;
    });
    
    setCustomFormula(prev => ({ ...prev, questionTypes: newTypes }));
    updateTotals(newTypes);
  };

  const updateTotals = (questionTypes: QuestionTypeConfig[]) => {
    // Separate by scope
    const perLoTypes = questionTypes.filter(qt => qt.scope === 'per-lo');
    const wholeQuizTypes = questionTypes.filter(qt => qt.scope === 'whole-quiz');
    
    // Calculate totals
    const totalPerLO = perLoTypes.reduce((sum, qt) => sum + qt.count, 0);
    const totalWholeQuiz = wholeQuizTypes.reduce((sum, qt) => sum + qt.count, 0);
    const totalQuestions = totalPerLO;
    
    // Update percentages for per-LO questions
    const updatedTypes = questionTypes.map(qt => {
      if (qt.scope === 'per-lo' && qt.editMode === 'count') {
        return {
          ...qt,
          percentage: totalPerLO > 0 ? Math.round((qt.count / totalPerLO) * 100) : 0
        };
      } else if (qt.scope === 'whole-quiz') {
        return {
          ...qt,
          percentage: 0 // Whole quiz questions don't have percentages
        };
      }
      return qt;
    });
    
    setCustomFormula(prev => ({
      ...prev,
      questionTypes: updatedTypes,
      totalQuestions,
      totalPerLO,
      totalWholeQuiz
    }));
  };

  // Get approach-specific question type distribution (matches backend)
  const getApproachDistribution = (approach: PedagogicalApproach, questionsPerLO: number) => {
    const distributions = {
      'support': {
        'multiple-choice': 40,
        'true-false': 20,
        'flashcard': 30,
        'summary': 10
      },
      'assess': {
        'multiple-choice': 50,
        'true-false': 20,
        'discussion': 20,
        'summary': 10
      },
      'gamify': {
        'matching': 30,
        'ordering': 25,
        'multiple-choice': 25,
        'flashcard': 20
      },
      'custom': {
        'multiple-choice': 35,
        'true-false': 15,
        'flashcard': 15,
        'discussion': 15,
        'summary': 10,
        'matching': 10
      }
    };

    const dist = distributions[approach] || distributions['support'];
    const questionTypes = [];
    
    Object.entries(dist).forEach(([type, percentage]) => {
      const count = Math.round((percentage / 100) * questionsPerLO);
      if (count > 0) {
        questionTypes.push({
          type,
          count,
          percentage,
          scope: 'per-lo' as const,
          editMode: 'count' as const
        });
      }
    });

    return {
      questionTypes,
      totalQuestions: questionsPerLO,
      totalPerLO: questionsPerLO,
      totalWholeQuiz: 0
    };
  };

  // Update custom formula when questionsPerLO or approach changes
  // But only if we don't have a current plan with existing custom formula AND user is not being restored
  useEffect(() => {
    console.log('🔄 Approach changed to:', approach, 'questionsPerLO:', questionsPerLO);
    console.log('🔄 Current plan exists:', !!currentPlan, 'has customFormula:', !!(currentPlan && currentPlan.customFormula));
    console.log('🔄 isUserEditingApproach:', isUserEditingApproach);
    
    // Skip if we have a current plan that should restore its own data, UNLESS user is actively editing
    if (currentPlan && currentPlan.customFormula && !isUserEditingApproach) {
      console.log('⏭️ Skipping formula update - using current plan data');
      return;
    }
    
    if (approach === 'custom') {
      const totalPerLO = customFormula.questionTypes.filter(qt => qt.scope === 'per-lo').reduce((sum, qt) => sum + qt.count, 0);
      setQuestionsPerLO(totalPerLO);
    } else {
      // Use approach-specific distribution (matches backend logic)
      console.log('🎯 Setting approach-specific distribution for:', approach);
      const newFormula = getApproachDistribution(approach, questionsPerLO);
      console.log('🎯 New formula:', newFormula);
      setCustomFormula(newFormula);
    }
  }, [approach, questionsPerLO, currentPlan, isUserEditingApproach]);

  // Debug advanced edit visibility
  useEffect(() => {
    console.log('🔍 Advanced edit visibility check:', {
      approach,
      showAdvancedEdit,
      shouldShow: approach === 'custom' || showAdvancedEdit,
      customFormula
    });
  }, [approach, showAdvancedEdit, customFormula]);

  // Auto-save settings when they change (but not during initial load/restoration)
  useEffect(() => {
    // Skip saving during initial component mount and plan restoration
    if (!quizId || isUserEditingApproach) return;
    
    // Add small delay to avoid saving during rapid state changes
    const timeoutId = setTimeout(() => {
      saveQuizSettings(quizId);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [approach, questionsPerLO, showAdvancedEdit, customFormula, quizId, isUserEditingApproach]);

  if (learningObjectives.length === 0) {
    return (
      <div className="question-generation">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Generate Questions</h3>
            <p className="card-description">
              Please set learning objectives first before generating questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="question-generation">
      {/* Phase indicator */}
      <div className="phase-progress">
        <div className="phase-steps">
          <div className={`phase-step ${questions.length === 0 ? 'active' : 'completed'}`}>
            <div className="step-indicator">
              <div className="step-number">1</div>
              {activePlan && <CheckCircle className="step-check" size={16} />}
            </div>
            <div className="step-content">
              <div className="step-title">Plan Generation</div>
            </div>
          </div>
          
          <div className="phase-connector">
            <div className={`connector-line ${questions.length > 0 ? 'completed' : ''}`}></div>
          </div>
          
          <div className={`phase-step ${questions.length > 0 ? 'active' : ''}`}>
            <div className="step-indicator">
              <div className="step-number">2</div>
              {questions.length > 0 && <CheckCircle className="step-check" size={16} />}
            </div>
            <div className="step-content">
              <div className="step-title">Question Generation</div>
            </div>
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        // Phase 1: Plan Generation & Review
        <div className="plan-phase">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Generation Plan</h3>
              <p className="card-description">
                Configure how questions will be generated based on your learning objectives and pedagogical approach
              </p>
            </div>

            {/* Approach Selection */}
            <div className="pedagogical-approaches">
              <h4>Choose Pedagogical Approach</h4>
              <div className="approaches-grid">
                {pedagogicalApproaches.map((app) => (
                  <div
                    key={app.id}
                    className={`approach-card ${approach === app.id ? 'selected' : ''}`}
                    onClick={() => {
                      console.log('🎯 Approach selected:', app.id);
                      setIsUserEditingApproach(true);
                      setApproach(app.id);
                      // Reset the flag after a short delay to allow approach change to process
                      setTimeout(() => setIsUserEditingApproach(false), 100);
                    }}
                  >
                    <app.icon size={24} />
                    <h5>{app.title}</h5>
                    <p>{app.description}</p>
                    {app.id !== 'custom' && approach === app.id && (
                      <button
                        className="btn btn-outline btn-sm advanced-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🔧 Advanced Edit clicked for approach:', approach);
                          console.log('🔧 Current customFormula before:', customFormula);
                          setIsUserEditingApproach(true);
                          setShowAdvancedEdit(true);
                          // Reset the flag after a short delay
                          setTimeout(() => setIsUserEditingApproach(false), 100);
                        }}
                      >
                        <Edit size={14} />
                        Advanced Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            {approach !== 'custom' && (
              <div className="generation-settings">
                <div className="setting-group">
                  <label>Questions per Learning Objective: {questionsPerLO}</label>
                  <div className="questions-counter">
                    <button
                      className="btn btn-outline counter-btn"
                      onClick={() => setQuestionsPerLO(Math.max(1, questionsPerLO - 1))}
                    >
                      -
                    </button>
                    <span className="counter-value">{questionsPerLO}</span>
                    <button
                      className="btn btn-outline counter-btn"
                      onClick={() => setQuestionsPerLO(Math.min(10, questionsPerLO + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="setting-group">
                  <label>Total Questions: {learningObjectives.length * questionsPerLO}</label>
                  <p className="setting-description">
                    Based on {learningObjectives.length} learning objectives
                  </p>
                </div>
              </div>
            )}

            {approach === 'custom' && (
              <div className="generation-settings">
                <div className="setting-group">
                  <label>Custom Formula Configuration</label>
                  <p className="setting-description">
                    Configure question types and quantities using the advanced editor below.
                  </p>
                </div>
                <div className="setting-group">
                  <label>Total Questions: {learningObjectives.length * customFormula.totalQuestions}</label>
                  <p className="setting-description">
                    {customFormula.totalQuestions} questions per learning objective × {learningObjectives.length} objectives
                  </p>
                </div>
              </div>
            )}

            {/* Advanced Edit Section */}
            {(approach === 'custom' || showAdvancedEdit) && (
              <div className="advanced-edit-section">
                <div className="advanced-header">
                  <h4>Question Formula Editor</h4>
                  <div className="advanced-actions">
                    {approach !== 'custom' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowAdvancedEdit(false)}
                      >
                        Simple View
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="formula-info">
                  <p className="formula-description">
                    {approach === 'custom' 
                      ? 'Define your own mix of question types and quantities.'
                      : `Customize the default ${approach} approach with your preferred question distribution.`
                    }
                  </p>
                </div>

                {/* Question Types Configuration */}
                <div className="question-types-config">
                  <div className="config-header">
                    <h5>Question Type Configuration</h5>
                    <p>Define how many questions of each type to generate per learning objective</p>
                  </div>
                  
                  {customFormula.questionTypes.map((questionType, index) => (
                    <div key={index} className="question-type-row">
                      <div className="question-type-select">
                        <select
                          className="select-input"
                          value={questionType.type}
                          onChange={(e) => updateQuestionType(index, 'type', e.target.value)}
                        >
                          {availableQuestionTypes.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Edit Mode Toggle */}
                      <div className="edit-mode-toggle">
                        <button
                          className={`btn btn-sm ${questionType.editMode === 'count' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => updateQuestionType(index, 'editMode', 'count')}
                        >
                          #
                        </button>
                        <button
                          className={`btn btn-sm ${questionType.editMode === 'percentage' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => updateQuestionType(index, 'editMode', 'percentage')}
                        >
                          %
                        </button>
                      </div>
                      
                      {/* Count/Percentage Input */}
                      {questionType.editMode === 'count' ? (
                        <div className="count-input">
                          <button
                            className="btn btn-outline btn-sm counter-btn"
                            onClick={() => updateQuestionType(index, 'count', questionType.count - 1)}
                            disabled={questionType.count <= 0}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="counter-value">{questionType.count}</span>
                          <button
                            className="btn btn-outline btn-sm counter-btn"
                            onClick={() => updateQuestionType(index, 'count', questionType.count + 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="percentage-input">
                          <input
                            type="number"
                            className="input-sm"
                            value={questionType.percentage}
                            onChange={(e) => updateQuestionType(index, 'percentage', parseInt(e.target.value) || 0)}
                            min="0"
                            max="100"
                          />
                          <span>%</span>
                        </div>
                      )}

                      {/* Scope Toggle */}
                      <div className="scope-toggle">
                        <button
                          className={`btn btn-sm ${questionType.scope === 'per-lo' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => updateQuestionType(index, 'scope', 'per-lo')}
                          title="Per Learning Objective"
                        >
                          LO
                        </button>
                        <button
                          className={`btn btn-sm ${questionType.scope === 'whole-quiz' ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => updateQuestionType(index, 'scope', 'whole-quiz')}
                          title="Whole Quiz"
                        >
                          Quiz
                        </button>
                      </div>
                      
                      {customFormula.questionTypes.length > 1 && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => removeQuestionType(index)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {customFormula.questionTypes.length < availableQuestionTypes.length && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={addQuestionType}
                    >
                      <Plus size={14} />
                      Add Question Type
                    </button>
                  )}
                </div>

                {/* Live Preview */}
                <div className="distribution-preview">
                  <h5>Live Preview</h5>
                  
                  {/* Per-LO Questions */}
                  {customFormula.questionTypes.filter(qt => qt.scope === 'per-lo').length > 0 && (
                    <div className="preview-section">
                      <h6>Per Learning Objective ({customFormula.totalPerLO} questions each)</h6>
                      <div className="preview-grid">
                        {customFormula.questionTypes.filter(qt => qt.scope === 'per-lo').map((qt, index) => (
                          <div key={index} className="preview-item">
                            <span className="question-type-label">
                              {availableQuestionTypes.find(t => t.value === qt.type)?.label || qt.type}
                            </span>
                            <span className="question-count">{qt.count} questions</span>
                            <span className="question-source">({qt.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Whole Quiz Questions */}
                  {customFormula.questionTypes.filter(qt => qt.scope === 'whole-quiz').length > 0 && (
                    <div className="preview-section">
                      <h6>Whole Quiz ({customFormula.totalWholeQuiz} questions total)</h6>
                      <div className="preview-grid">
                        {customFormula.questionTypes.filter(qt => qt.scope === 'whole-quiz').map((qt, index) => (
                          <div key={index} className="preview-item">
                            <span className="question-type-label">
                              {availableQuestionTypes.find(t => t.value === qt.type)?.label || qt.type}
                            </span>
                            <span className="question-count">{qt.count} questions</span>
                            <span className="question-source">(whole quiz)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="total-summary">
                    <p><strong>Per Learning Objective:</strong> {customFormula.totalPerLO} questions</p>
                    <p><strong>Whole Quiz:</strong> {customFormula.totalWholeQuiz} questions</p>
                    <p><strong>Total Quiz Questions:</strong> {(learningObjectives.length * customFormula.totalPerLO) + customFormula.totalWholeQuiz}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Plan Button */}
            <div className="plan-action">
              <button
                className="btn btn-primary"
                onClick={handleGeneratePlan}
                disabled={generating || learningObjectives.length === 0 || assignedMaterials.length === 0}
              >
                {generating ? (
                  <>
                    <div className="loading-spinner"></div>
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    Generate Plan
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Plan Review */}
          {currentPlan && (
            <div className="card">
              <div className="card-header">
                <div className="card-header-content">
                  <div>
                    <h3 className="card-title">Plan Review</h3>
                    <p className="card-description">
                      Review the generated plan and approve it to proceed with question generation
                    </p>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleGoBackToPlan}
                    disabled={loading || isRegenerating}
                  >
                    <Settings size={16} />
                    Change Approach
                  </button>
                </div>
              </div>

              <div className="plan-summary">
                {/* Plan Overview Cards */}
                <div className="plan-overview">
                  <div className="overview-card">
                    <div className="overview-label">Approach</div>
                    <div className="overview-value">{currentPlan.approach}</div>
                  </div>
                  <div className="overview-card">
                    <div className="overview-label">Questions per LO</div>
                    <div className="overview-value">{currentPlan.questionsPerLO}</div>
                  </div>
                  <div className="overview-card">
                    <div className="overview-label">Total Questions</div>
                    <div className="overview-value">{currentPlan.totalQuestions}</div>
                  </div>
                </div>

                {/* Question Type Distribution */}
                <div className="plan-section-card">
                  <div className="section-header">
                    <h4 className="section-title">Question Type Distribution</h4>
                  </div>
                  <div className="distribution-grid">
                    {currentPlan.distribution.map((dist, index) => (
                      <div key={index} className="distribution-item-card">
                        <div className="distribution-header">
                          <span className="question-type-label">{dist.type.replace('-', ' ')}</span>
                          <span className="question-percentage">{dist.percentage}%</span>
                        </div>
                        <div className="question-count-large">{dist.totalCount}</div>
                        <div className="question-count-label">questions</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Breakdown by Learning Objective */}
                <div className="plan-section-card">
                  <div className="section-header">
                    <h4 className="section-title">Breakdown by Learning Objective</h4>
                  </div>
                  <div className="breakdown-grid">
                    {currentPlan.breakdown.map((item, index) => (
                      <div key={index} className="breakdown-item-card">
                        <div className="lo-header">
                          <div className="lo-number">LO {index + 1}</div>
                        </div>
                        <div className="lo-text">
                          {typeof item.learningObjective === 'string' 
                            ? learningObjectives[index] 
                            : item.learningObjective.text}
                        </div>
                        <div className="lo-question-types">
                          {item.questionTypes.map((qt, qtIndex) => (
                            <div key={qtIndex} className="question-type-badge">
                              <span className="question-count-badge">{qt.count}</span>
                              <span className="question-type-name">{qt.type.replace('-', ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="plan-actions">
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={handleGoBackToPlan}
                  disabled={loading || isRegenerating}
                >
                  <Settings size={18} />
                  Change Approach & Regenerate Plan
                </button>
                
                {hasExistingQuestions && (
                  <button
                    className="btn btn-warning"
                    onClick={() => handleGenerateQuestions(true)}
                    disabled={loading || isRegenerating}
                  >
                    <Wand2 size={16} />
                    Regenerate Questions
                  </button>
                )}
                
                <button
                  className="btn btn-primary"
                  onClick={() => handleGenerateQuestions(false)}
                  disabled={loading || isRegenerating}
                >
                  <Wand2 size={16} />
                  {hasExistingQuestions ? 'Add More Questions' : 'Generate Questions'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Show Generated Questions Directly (No intermediate page)
        <div className="questions-container">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Questions Generated Successfully!</h3>
              <p className="card-description">
                Your quiz has been generated with {questions.length} questions. Review the summary below.
              </p>
            </div>
            

            {/* Prompt Analysis Section */}
            <div className="prompt-analysis">
              <h4>Generation Prompt Analysis</h4>
              <p>See exactly how each question was generated and what prompts were used:</p>
              
              <div className="prompt-tabs">
                <div className="prompt-tab-content">
                  <div className="prompts-by-lo">
                    {getPromptAnalysis().promptsByLO.map((loData, index) => (
                      <div key={index} className="lo-prompt-group">
                        <div className="lo-header">
                          <span className="lo-title">LO {index + 1}: {loData.objective}</span>
                          <span className="lo-count">{loData.questionCount} questions</span>
                        </div>
                        <div className="prompt-list">
                          {loData.prompts.map((promptData, pIndex) => (
                            <div key={pIndex} className="prompt-item">
                              <div className="prompt-header">
                                <span className="prompt-question">Q{promptData.questionNumber}</span>
                                <span className="prompt-type">{promptData.type.replace('-', ' ')}</span>
                                <span className="prompt-method">{promptData.method}</span>
                                <span className={`complexity-badge ${promptData.complexity}`}>{promptData.complexity}</span>
                              </div>
                              <div className="sub-objective">
                                <strong>Sub-Learning Objective:</strong> {promptData.subObjective}
                              </div>
                              <div className="focus-area">
                                <strong>Focus Area:</strong> <span className="focus-tag">{promptData.focusArea}</span>
                              </div>
                              <div className="prompt-text">
                                <strong>Detailed AI Prompt:</strong> {promptData.prompt}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="generation-summary">
                <h5>AI Generation Method Summary</h5>
                <div className="method-stats">
                  {Object.entries(getPromptAnalysis().methodUsage).map(([method, count]) => (
                    <div key={method} className="method-stat">
                      <span className="method-name">{method.replace('-', ' → ')}</span>
                      <span className="method-count">{count} questions</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="prompt-analysis-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleGoBackToPlan}
                  disabled={loading || isRegenerating}
                >
                  <Settings size={16} />
                  Change Approach & Regenerate
                </button>
                
                {hasExistingQuestions && (
                  <button
                    className="btn btn-warning"
                    onClick={() => handleGenerateQuestions(true)}
                    disabled={loading || isRegenerating}
                  >
                    <Wand2 size={16} />
                    Regenerate with Same Plan
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card error-card">
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
    </div>
  );
};



export default QuestionGeneration;