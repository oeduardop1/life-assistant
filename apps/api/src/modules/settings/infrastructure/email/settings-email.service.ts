import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../../../logger/logger.service';

/**
 * SettingsEmailService - Sends security notification emails
 *
 * Currently logs email content (Resend integration planned for M3.x).
 * When Resend is implemented, this service will send actual emails.
 *
 * @see docs/specs/integrations/resend.md for future implementation
 */
@Injectable()
export class SettingsEmailService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext(SettingsEmailService.name);
  }

  /**
   * Send security notification to old email when email change is requested
   */
  sendEmailChangeNotification(
    oldEmail: string,
    newEmail: string,
    userName: string,
  ): void {
    // TODO: Implement actual email sending via Resend (M3.x)
    // For now, log the notification for debugging/audit purposes
    this.logger.log(
      `Email change notification would be sent to ${oldEmail}`,
      {
        type: 'email_change_notification',
        oldEmail,
        newEmail,
        userName,
        subject: 'Solicitação de alteração de email',
      },
    );

    // Email template for future implementation:
    // Subject: Solicitação de alteração de email
    // Body:
    // Olá {userName},
    //
    // Recebemos uma solicitação para alterar o email da sua conta
    // de {oldEmail} para {newEmail}.
    //
    // Se você não fez essa solicitação, entre em contato conosco
    // imediatamente.
  }

  /**
   * Send security notification when password is changed
   */
  sendPasswordChangeNotification(
    email: string,
    userName: string,
  ): void {
    // TODO: Implement actual email sending via Resend (M3.x)
    this.logger.log(
      `Password change notification would be sent to ${email}`,
      {
        type: 'password_change_notification',
        email,
        userName,
        subject: 'Sua senha foi alterada',
      },
    );

    // Email template for future implementation:
    // Subject: Sua senha foi alterada
    // Body:
    // Olá {userName},
    //
    // Sua senha foi alterada com sucesso.
    //
    // Se você não fez essa alteração, entre em contato conosco
    // imediatamente.
  }
}
