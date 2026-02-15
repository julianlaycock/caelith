export type QuietudeVariantId = 'v1' | 'v2' | 'v3' | 'v4';

export interface QuietudeTokens {
  bg: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentStrong: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  focus: string;
}

export interface QuietudeVariant {
  id: QuietudeVariantId;
  name: string;
  tagline: string;
  narrative: string;
  tokens: QuietudeTokens;
  heroGradient: string;
}

export const QUIETUDE_VARIANTS: Record<QuietudeVariantId, QuietudeVariant> = {
  v1: {
    id: 'v1',
    name: 'Signal Sand',
    tagline: 'Calm intelligence for operator dashboards',
    narrative: 'A warm precision theme that feels premium and human while still retaining analytical sharpness.',
    tokens: {
      bg: '#D2CFBE',
      surface: '#E4E0D4',
      surfaceElevated: '#F0ECE2',
      textPrimary: '#2D2722',
      textSecondary: '#5A524B',
      accent: '#ADA094',
      accentStrong: '#6B635B',
      border: '#B9B19F',
      success: '#3D6658',
      warning: '#9C6E2D',
      danger: '#8A4A45',
      focus: '#6B635B',
    },
    heroGradient: 'linear-gradient(140deg, #D2CFBE 0%, #CDC8AD 45%, #B9BCC0 100%)',
  },
  v2: {
    id: 'v2',
    name: 'Slate Quietude',
    tagline: 'Tech-forward calm with cool analytical edges',
    narrative: 'A cooler, data-centric aesthetic tuned for teams that want premium modernity without visual noise.',
    tokens: {
      bg: '#B9BCC0',
      surface: '#D6D9DC',
      surfaceElevated: '#E7EAED',
      textPrimary: '#252A2F',
      textSecondary: '#4C545C',
      accent: '#C5C0BF',
      accentStrong: '#5B6570',
      border: '#9CA3AB',
      success: '#3A6262',
      warning: '#8A6D3A',
      danger: '#7F5050',
      focus: '#5B6570',
    },
    heroGradient: 'linear-gradient(135deg, #B9BCC0 0%, #C5C0BF 55%, #D2CFBE 100%)',
  },
  v3: {
    id: 'v3',
    name: 'Bronze Ledger',
    tagline: 'Bold executive tone for high-stakes operations',
    narrative: 'A richer accent-forward scheme designed for commanding interfaces and decision-heavy workflows.',
    tokens: {
      bg: '#CDC8AD',
      surface: '#E1D7BF',
      surfaceElevated: '#EFE6D0',
      textPrimary: '#2B241C',
      textSecondary: '#5E4F3D',
      accent: '#C8AD80',
      accentStrong: '#7A5F37',
      border: '#BFA57B',
      success: '#3C6B4A',
      warning: '#996F28',
      danger: '#8A4A3D',
      focus: '#7A5F37',
    },
    heroGradient: 'linear-gradient(155deg, #CDC8AD 0%, #C8AD80 50%, #ADA094 100%)',
  },
  v4: {
    id: 'v4',
    name: 'Mist Protocol',
    tagline: 'Soft futurism with premium contrast control',
    narrative: 'A muted, almost architectural palette that creates trust and precision for compliance work.',
    tokens: {
      bg: '#C5C0BF',
      surface: '#DBD6D5',
      surfaceElevated: '#EAE5E4',
      textPrimary: '#292627',
      textSecondary: '#575253',
      accent: '#ADA094',
      accentStrong: '#5D5551',
      border: '#B4ABAA',
      success: '#3E6257',
      warning: '#8D6C36',
      danger: '#7F4C4B',
      focus: '#5D5551',
    },
    heroGradient: 'linear-gradient(160deg, #C5C0BF 0%, #D2CFBE 45%, #ADA094 100%)',
  },
};

export const QUIETUDE_VARIANT_LIST: QuietudeVariant[] = [
  QUIETUDE_VARIANTS.v1,
  QUIETUDE_VARIANTS.v2,
  QUIETUDE_VARIANTS.v3,
  QUIETUDE_VARIANTS.v4,
];
