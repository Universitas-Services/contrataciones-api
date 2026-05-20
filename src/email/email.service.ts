import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('FROM_EMAIL') || 'no-reply@universitas.legal';
    this.resend = new Resend(apiKey);
  }

  /**
   * Lee una plantilla HTML desde la carpeta templates y reemplaza placeholders.
   * Si la plantilla no existe, retorna un texto plano de respaldo.
   */
  private loadTemplate(templateName: string, replacements: Record<string, string>): string {
    try {
      const templatePath = path.join(__dirname, 'templates', templateName);
      let html = fs.readFileSync(templatePath, 'utf-8');

      for (const [key, value] of Object.entries(replacements)) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      return html;
    } catch (error) {
      this.logger.warn(`No se pudo cargar la plantilla ${templateName}: ${error}`);
      // Fallback: construir texto plano con los placeholders
      return Object.entries(replacements)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
  }

  /**
   * Método base para enviar correos electrónicos.
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
    }>;
  }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });

      if (error) {
        this.logger.error(`Error al enviar correo: ${JSON.stringify(error)}`);
        throw new Error(`Error al enviar correo: ${error.message}`);
      }

      this.logger.log(`Correo enviado exitosamente. ID: ${data?.id}`);
      return data;
    } catch (error) {
      this.logger.error(`Error enviando email: ${error}`);
      throw error;
    }
  }

  /**
   * Envía correo de recuperación de contraseña con un enlace de reset.
   */
  async sendPasswordResetEmail(to: string, nombre: string, resetLink: string) {
    const html = this.loadTemplate('password-reset.html', {
      nombre,
      resetLink,
    });

    return this.sendEmail({
      to,
      subject: 'Recuperación de Contraseña - Sistema de Contrataciones',
      html,
      text: `Hola ${nombre}, haz clic en el siguiente enlace para restablecer tu contraseña: ${resetLink}. Este enlace expira en 1 hora.`,
    });
  }

  /**
   * Envía correo notificando que el administrador ha cambiado la contraseña del usuario.
   */
  async sendPasswordChangedByAdminEmail(to: string, nombreUsuario: string, nombreAdmin: string) {
    const html = this.loadTemplate('password-changed-admin.html', {
      nombreUsuario,
      nombreAdmin,
    });

    return this.sendEmail({
      to,
      subject: 'Aviso de Seguridad: Contraseña Actualizada - Sistema de Contrataciones',
      html,
      text: `Hola ${nombreUsuario}, te informamos que tu administrador ${nombreAdmin} ha restablecido tu contraseña. En tu próximo inicio de sesión deberás configurar una nueva clave.`,
    });
  }

  /**
   * Envía un manual generado como archivo adjunto por correo electrónico.
   */
  async sendManualByEmail(to: string, nombre: string, manualBuffer: Buffer, filename: string) {
    const html = this.loadTemplate('manual-attached.html', {
      nombre,
      manualName: filename,
    });

    return this.sendEmail({
      to,
      subject: `Manual Adjunto: ${filename} - Sistema de Contrataciones`,
      html,
      text: `Hola ${nombre}, se adjunta el manual "${filename}" solicitado.`,
      attachments: [
        {
          filename,
          content: manualBuffer,
        },
      ],
    });
  }

  /**
   * Envía un pliego de condiciones generado como archivo adjunto por correo electrónico.
   */
  async sendPliegoByEmail(to: string, nombre: string, pliegoBuffer: Buffer, filename: string) {
    const html = this.loadTemplate('pliego-attached.html', {
      nombre,
      pliegoName: filename,
    });

    return this.sendEmail({
      to,
      subject: `Pliego de Condiciones Adjunto: ${filename} - Sistema de Contrataciones`,
      html,
      text: `Hola ${nombre}, se adjunta el pliego de condiciones "${filename}" solicitado.`,
      attachments: [
        {
          filename,
          content: pliegoBuffer,
        },
      ],
    });
  }
  /**
   * Envía un documento generado como archivo adjunto por correo electrónico.
   */
  async sendDocumentoExpedienteEmail(to: string, nombre: string, buffer: Buffer, filename: string) {
    const html = this.loadTemplate('documento-attached.html', {
      nombre,
      documentoName: filename,
    });

    return this.sendEmail({
      to,
      subject: `Documento Adjunto: ${filename} - Sistema de Contrataciones`,
      html,
      text: `Hola ${nombre}, se adjunta el documento "${filename}" solicitado.`,
      attachments: [
        {
          filename,
          content: buffer,
        },
      ],
    });
  }
}
