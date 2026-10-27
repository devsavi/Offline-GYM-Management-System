import { Exercise } from '../types';

export type RootStackParamList = {
  Onboarding: undefined;
  Dashboard: undefined;
  MemberProfile: { memberId: string };
  PlanBuilder: {
    memberId?: string;
    planId?: string;
    isTemporary?: boolean;
    initialExercises?: Exercise[];
  };
  AddMember: undefined;
};
