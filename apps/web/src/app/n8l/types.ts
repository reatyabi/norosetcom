export interface DirectoryLinkPreview {
  label: string;
  url: string;
  icon?: string | null;
}

export interface DirectoryPageItem {
  slug: string;
  title: string;
  name: string;
  bio: string;
  avatarUrl: string | null;
  themePreset: string;
  elementCount: number;
  publishedAt: string | null;
  isIndexable: boolean;
  socialPlatforms: string[];
  links: DirectoryLinkPreview[];
}
