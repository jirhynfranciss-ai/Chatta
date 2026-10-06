// Core domain types shared across the application.
// These mirror the Supabase/PostgreSQL schema defined in supabase/schema.sql

export type QuestionType = "TEXT" | "LONG_TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE";

export type QuestionOption = {
  value: string;
  label: string;
};

/** Describes when a question should be shown, based on a prior answer. */
export type ConditionalRule = {
  dependsOnQuestionKey: string;
  /** Show this question if the prior answer includes/equals one of these values */
  showWhenValueIn: string[];
};

export interface Question {
  id: string;
  key: string;
  question: string;
  introduction: string | null;
  type: QuestionType;
  options: QuestionOption[] | null;
  required: boolean;
  display_order: number;
  conditional_rule: ConditionalRule | null;
  is_active: boolean;
  is_supporting: boolean;
  placeholder: string | null;
  min_value: number | null;
  max_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  nickname: string | null;
  email: string;
  avatar_url: string | null;
  facebook_url: string | null;
  theme_preference: "light" | "dark" | "system";
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  user_id: string;
  theme: "light" | "dark" | "system";
  notifications_enabled: boolean;
  updated_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  user_id: string | null;
  anonymous_token: string | null;
  status: "in_progress" | "submitted";
  submitted_at: string | null;
  created_at: string;
}

export interface AnswerRecord {
  id: string;
  response_id: string;
  question_id: string;
  value_text: string | null;
  value_options: string[] | null;
  was_edited: boolean;
  skipped: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportingAnswerRecord {
  id: string;
  answer_id: string;
  question_id: string;
  value_text: string | null;
  value_options: string[] | null;
  skipped: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  status: "active" | "archived" | "blocked";
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message_text: string;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AdminUser {
  id: string;
  user_id: string;
  role: "admin" | "superadmin";
  created_at: string;
}

export interface AdminActivity {
  id: string;
  admin_id: string;
  action: string;
  resource: string | null;
  resource_id: string | null;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  website_title: string;
  welcome_message: string;
  final_message: string;
  questionnaire_enabled: boolean;
  allow_multiple_submissions: boolean;
  account_creation_enabled: boolean;
  chat_enabled: boolean;
  session_timeout_minutes: number;
  notifications_enabled: boolean;
  updated_at: string;
}

/** In-memory answer shape used by the questionnaire flow before persistence. */
export type LocalAnswerValue = string | string[] | null;

export interface LocalAnswer {
  questionId: string;
  value: LocalAnswerValue;
  skipped: boolean;
  edited: boolean;
}

export interface LocalSupportingAnswer {
  questionId: string;
  parentQuestionId: string;
  value: LocalAnswerValue;
  skipped: boolean;
}
