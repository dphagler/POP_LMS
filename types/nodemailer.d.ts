declare module "nodemailer" {
  export interface SendMailOptions {
    from?: string;
    to?: string | string[];
    subject?: string;
    html?: string;
    text?: string;
    [key: string]: unknown;
  }

  export interface SentMessageInfo {
    messageId: string;
    [key: string]: unknown;
  }

  export interface Transporter<TSentMessageInfo = SentMessageInfo> {
    sendMail(mailOptions: SendMailOptions): Promise<TSentMessageInfo>;
  }

  export interface TestAccount {
    user: string;
    pass: string;
    [key: string]: unknown;
  }

  export function createTransport(options: unknown): Transporter;
  export function createTestAccount(): Promise<TestAccount>;
  export function getTestMessageUrl(info: SentMessageInfo): string | false;

  const nodemailer: {
    createTransport: typeof createTransport;
    createTestAccount: typeof createTestAccount;
    getTestMessageUrl: typeof getTestMessageUrl;
  };

  export default nodemailer;
}
