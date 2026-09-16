/**
 * Milestone 13: Teacher Intelligence Type Definitions
 * Classroom concept mastery aggregation, struggle clustering,
 * intervention effectiveness, and differentiated instruction.
 */

import { PedagogyStrategy } from '../types/studentState';

export interface StudentMasterySnippet {
  uid: string;
  name: string;
  accuracy: number;
  learningStrain: number;
  consecutiveIncorrect: number;
  preferredPedagogy?: PedagogyStrategy;
}

export interface ConceptStruggleCluster {
  conceptId: string;
  conceptTitleEn: string;
  conceptTitleAr: string;
  totalStudentsAssessed: number;
  strugglingStudentCount: number;
  struggleRatePercentage: number;
  averageAccuracy: number;
  diagnosedPrerequisiteGap?: {
    prerequisiteId: string;
    prerequisiteTitleEn: string;
    prerequisiteTitleAr: string;
    gapSeverity: 'low' | 'moderate' | 'critical';
  };
  commonErrorPatterns: string[];
}

export interface ClassInterventionEfficacy {
  strategy: PedagogyStrategy;
  attemptsCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  efficacyRate: number; // 0.0 to 1.0
  averageNormalizedGain: number; // Hake gain g
  isCalibrated: boolean; // sample size >= 3
}

export interface DifferentiatedInstructionGroup {
  id: string;
  groupNameEn: string;
  groupNameAr: string;
  targetConceptId: string;
  recommendedPedagogy: PedagogyStrategy;
  students: StudentMasterySnippet[];
  pedagogicalRationaleEn: string;
  pedagogicalRationaleAr: string;
}

export interface TeacherActionRecommendation {
  id: string;
  priority: 'urgent' | 'high' | 'routine';
  category: 'prerequisite_review' | 'strategy_pivot' | 'advanced_challenge';
  titleEn: string;
  titleAr: string;
  actionPromptEn: string;
  actionPromptAr: string;
  targetedConceptId?: string;
}

export interface TeacherDashboardData {
  classId: string;
  className: string;
  totalStudents: number;
  activeRatePercentage: number;
  classAverageMastery: number;
  struggleClusters: ConceptStruggleCluster[];
  interventionEfficacy: Record<string, ClassInterventionEfficacy>;
  differentiatedGroups: DifferentiatedInstructionGroup[];
  actionRecommendations: TeacherActionRecommendation[];
}
