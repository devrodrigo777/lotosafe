export interface Company {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    radius: number;
  };
  adminEmail: string;
  createdAt: any;
  trialExpiresAt?: any;
  canResetTrial?: boolean;
  status?: 'active' | 'expired' | 'inactive';
  licenseType?: 'trial' | 'monthly' | 'lifetime';
  isTrialExtended?: boolean;
}

export interface InstructionStep {
  id: string;
  type: 'text' | 'checkbox' | 'image' | 'single_choice' | 'multi_choice' | 'heading' | 'separator';
  label: string;
  options?: string[];
  required?: boolean;
  value?: any;
  hideNumber?: boolean;
  backgroundColor?: string;
}

export interface Instruction {
  id: string;
  companyId: string;
  equipmentName: string;
  location?: string;
  category: string;
  steps: InstructionStep[];
  likes: number;
  version?: number;
  qrCodeUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Comment {
  id: string;
  instructionId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: any;
}
