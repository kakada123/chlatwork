export interface ProfileLink {
  id?: string;
  title: string;
  url: string;
  type?: string;
  position?: number;
  isEnabled: boolean;
  clickCount?: number;
}

export interface LinkProfile {
  id?: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  theme: string;
  backgroundMode: string;
  backgroundColor: string;
  gradientColor: string;
  colorMode: string;
  font: string;
  radius: string;
  buttonStyle: string;
  showBranding: boolean;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
  links: ProfileLink[];
  viewCount?: number;
  hasAvatarUpload?: boolean;
  hasBackgroundUpload?: boolean;
}
