export interface TelegramUser {
  id: number;
  is_bot?: boolean;
}

export interface TelegramChat {
  id: number;
  type: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

export interface TelegramApiResponse<T = unknown> {
  ok?: boolean;
  result?: T;
  description?: string;
}
