import * as React from 'https://esm.sh/react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22'

interface RecoveryEmailProps {
  supabase_url: string
  token_hash: string
  redirect_to: string
  logo_url: string
  user_name: string
}

export const RecoveryEmail = ({
  supabase_url,
  token_hash,
  redirect_to,
  logo_url,
  user_name,
}: RecoveryEmailProps) => {
  const recoveryUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${encodeURIComponent(redirect_to)}`

  return (
    <Html>
      <Head />
      <Preview>Redefina sua senha do vouRevisar</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src={logo_url}
              width="150"
              height="auto"
              alt="vouRevisar"
              style={logo}
            />
          </Section>

          {/* Conteúdo Principal */}
          <Section style={contentSection}>
            <Heading style={h1}>Redefinir sua senha 🔐</Heading>
            
            <Text style={text}>
              Olá{user_name ? `, ${user_name}` : ''}!
            </Text>
            
            <Text style={text}>
              Recebemos uma solicitação para redefinir a senha da sua conta no vouRevisar. Clique no botão abaixo para criar uma nova senha:
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={recoveryUrl}>
                Redefinir minha senha
              </Button>
            </Section>

            <Section style={warningSection}>
              <Text style={warningText}>
                ⚠️ Este link expira em 1 hora por motivos de segurança.
              </Text>
            </Section>

            <Text style={textSmall}>
              Ou copie e cole este link no seu navegador:
            </Text>
            <Text style={linkText}>
              <Link href={recoveryUrl} style={link}>
                {recoveryUrl}
              </Link>
            </Text>

            <Text style={textMuted}>
              Se você não solicitou a redefinição de senha, pode ignorar este email. Sua senha atual permanecerá inalterada.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} vouRevisar. Todos os direitos reservados.
            </Text>
            <Text style={footerText}>
              Por segurança, nunca compartilhe este link com outras pessoas.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default RecoveryEmail

// Estilos
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  borderRadius: '12px',
  overflow: 'hidden',
  maxWidth: '600px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
}

const logoSection = {
  backgroundColor: '#0066FF',
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
}

const contentSection = {
  padding: '40px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 24px',
  padding: '0',
  lineHeight: '1.3',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const textSmall = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '24px 0 8px',
}

const textMuted = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '24px 0 0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0066FF',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const warningSection = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
  border: '1px solid #fcd34d',
}

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
}

const linkText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '1.5',
  wordBreak: 'break-all' as const,
  margin: '0',
}

const link = {
  color: '#0066FF',
  textDecoration: 'underline',
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '24px 40px',
  borderTop: '1px solid #e5e7eb',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
}
