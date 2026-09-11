export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  contact?: {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: number;
  };
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    user?: TelegramUser;
  }>;
  date?: number;
  reply_to_message?: TelegramMessage;
  new_chat_members?: TelegramUser[];
  left_chat_member?: TelegramUser;
  voice?: {
    file_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
  photo?: Array<{
    file_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  inline_message_id?: string;
  data?: string;
}

export interface TelegramInlineQuery {
  id: string;
  from: TelegramUser;
  query: string;
  offset: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  inline_query?: TelegramInlineQuery;
  chat_member?: {
    chat: TelegramChat;
    date: number;
    new_chat_member: {
      user: TelegramUser;
      status: string;
      is_member?: boolean;
    };
  };
}

export interface TelegramTextMention {
  type: 'text_mention';
  offset: number;
  length: number;
  user: TelegramUser;
}

export interface TelegramPreformattedText {
  type: 'pre';
  offset: number;
  length: number;
  language?: string;
}

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
  switch_inline_query?: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

export type TelegramReplyMarkup =
  | TelegramInlineKeyboard
  | {
      keyboard: Array<Array<{ text: string; request_contact?: boolean }>>;
      resize_keyboard?: boolean;
      one_time_keyboard?: boolean;
    }
  | { remove_keyboard: true };

export interface TelegramApiResponse<T = unknown> {
  ok?: boolean;
  result?: T;
  description?: string;
}
