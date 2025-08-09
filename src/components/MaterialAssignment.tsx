import { FileText, Link, Check } from 'lucide-react';
import { Material } from '../services/api';
import '../styles/components/MaterialAssignment.css';

interface MaterialUI {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'url' | 'text';
  uploadDate: string;
  content?: string;
}

interface MaterialAssignmentProps {
  courseId: string;
  assignedMaterials: string[];
  onAssignedMaterialsChange: (materials: string[]) => void;
  courseMaterials?: Material[];
}

const MaterialAssignment = ({ courseId, assignedMaterials, onAssignedMaterialsChange, courseMaterials: propsCourseMaterials }: MaterialAssignmentProps) => {
  // Use real materials if provided, otherwise use mock data
  const materials = propsCourseMaterials || [];
  
  // Transform backend materials to match the UI interface
  const courseMaterials: MaterialUI[] = materials.map(m => ({
    id: m._id,
    name: m.name,
    type: m.type,
    uploadDate: new Date(m.createdAt).toLocaleDateString(),
    content: m.content || m.url || m.filePath
  }));

  const handleMaterialToggle = (materialId: string) => {
    if (assignedMaterials.includes(materialId)) {
      onAssignedMaterialsChange(assignedMaterials.filter(id => id !== materialId));
    } else {
      onAssignedMaterialsChange([...assignedMaterials, materialId]);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Link size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  return (
      <div className="material-assignment">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Assign Materials to Quiz</h3>
            <p className="card-description">
              Select which materials should be used to generate questions for this quiz
            </p>
          </div>

          {courseMaterials.length === 0 ? (
              <div className="no-materials">
                <p>No materials found for this course. Please upload materials first.</p>
              </div>
          ) : (
              <div className="materials-assignment-grid">
                <div className="assignment-header">
                  <h4>Available Materials ({courseMaterials.length})</h4>
                  <p>Select materials to use for this quiz</p>
                </div>

                <div className="materials-list">
                  {courseMaterials.map((material) => {
                    const isAssigned = assignedMaterials.includes(material.id);

                    return (
                        <div
                            key={material.id}
                            className={`material-assignment-card ${isAssigned ? 'assigned' : ''}`}
                            onClick={() => handleMaterialToggle(material.id)}
                        >
                          <div className="material-info">
                            <div className="material-icon">
                              {getFileIcon(material.type)}
                            </div>
                            <div className="material-details">
                              <div className="material-name">{material.name}</div>
                              <div className="material-meta">
                                {material.type.toUpperCase()} • {material.uploadDate}
                              </div>
                              {material.content && (
                                  <div className="material-preview">
                                    {material.content.length > 100
                                        ? `${material.content.substring(0, 100)}...`
                                        : material.content
                                    }
                                  </div>
                              )}
                            </div>
                          </div>

                          <div className="assignment-controls">
                            <div className={`assignment-checkbox ${isAssigned ? 'checked' : ''}`}>
                              {isAssigned && <Check size={16} />}
                            </div>
                            <div className="assignment-status">
                              {isAssigned ? 'Use for this quiz' : 'Click to assign'}
                            </div>
                          </div>
                        </div>
                    );
                  })}
                </div>

                {assignedMaterials.length > 0 && (
                    <div className="assignment-summary">
                      <div className="summary-card">
                        <h4>Quiz Materials Summary</h4>
                        <p>{assignedMaterials.length} material(s) assigned to this quiz</p>
                        <div className="assigned-materials-list">
                          {assignedMaterials.map(materialId => {
                            const material = courseMaterials.find(m => m.id === materialId);
                            return material ? (
                                <div key={materialId} className="assigned-material-tag">
                                  {getFileIcon(material.type)}
                                  <span>{material.name}</span>
                                </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                )}

                {assignedMaterials.length === 0 && (
                    <div className="assignment-warning">
                      <p>⚠️ Please select at least one material to generate questions from.</p>
                    </div>
                )}
              </div>
          )}
        </div>
      </div>
  );
};

export default MaterialAssignment;