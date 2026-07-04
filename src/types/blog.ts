export interface Blog {
  title: string;
  slug: string;
  date: string;
  description: string;
  tags: string[];
  coverImage?: string;
  content: string;
}
