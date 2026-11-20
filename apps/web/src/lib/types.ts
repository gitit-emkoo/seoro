export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  hasAvatar?: boolean;
  role?: string;
  createdAt?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  onboardingSource?: string | null;
  survey?: { selectedCodes: string[]; completedAt: string } | null;
  couple?: {
    roomId: string;
    role: 'CREATOR' | 'PARTNER';
    status: 'WAITING_PARTNER' | 'ACTIVE' | 'INACTIVE';
    connectedAt: string | null;
    createdAt: string;
  } | null;
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};

export type CoupleRoom = {
  id: string;
  status: 'WAITING_PARTNER' | 'ACTIVE' | 'INACTIVE';
  role: 'CREATOR' | 'PARTNER';
  createdAt: string;
  connectedAt: string | null;
  members: Array<{
    userId: string;
    email: string;
    name: string | null;
    hasAvatar?: boolean;
    role: 'CREATOR' | 'PARTNER';
    joinedAt: string;
  }>;
  pendingInvite: {
    invitationCode: string;
    expiresAt: string;
    status: string;
  } | null;
};

export type CreateRoomResponse = {
  room: {
    id: string;
    status: string;
    createdAt: string;
  };
  invite: {
    invitationCode: string;
    token: string;
    expiresAt: string;
  };
};
