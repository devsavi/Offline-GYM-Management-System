export type RootStackParamList = {
  Onboarding: undefined;
  Dashboard: undefined;
  MemberProfile: { memberId: string };
  PlanBuilder: { memberId: string; planId?: string };
  AddMember: undefined;
};
