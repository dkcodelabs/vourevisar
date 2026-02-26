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
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'

interface MagicLinkEmailProps {
  supabase_url: string
  token: string
  token_hash: string
  redirect_to: string
  logo_url: string
  user_name: string
}

export const MagicLinkEmail = ({
  supabase_url,
  token,
  token_hash,
  redirect_to,
  logo_url,
  user_name,
}: MagicLinkEmailProps) => {
  const magicLinkUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=magiclink&redirect_to=${encodeURIComponent(redirect_to)}`

  return (
    <Html>
      <Head />
      <Preview>Seu link de acesso ao vouRevisar</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src={logo_url}
              width="220"
              height="auto"
              alt="vouRevisar"
              style={logo}
            />
          </Section>

          {/* Conteúdo Principal */}
          <Section style={contentSection}>
            <Heading style={h1}>Seu link de acesso 🔗</Heading>

            <Text style={text}>
              Olá{user_name ? `, ${user_name}` : ''}!
            </Text>

            <Text style={text}>
              Use o botão abaixo para acessar sua conta no vouRevisar de forma rápida e segura:
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={magicLinkUrl}>
                Acessar minha conta
              </Button>
            </Section>

            <Text style={textSmall}>
              Ou use este código de acesso temporário:
            </Text>
            <Section style={codeSection}>
              <Text style={codeText}>{token}</Text>
            </Section>

            <Text style={textSmall}>
              Ou copie e cole este link no seu navegador:
            </Text>
            <Text style={linkText}>
              <Link href={magicLinkUrl} style={link}>
                {magicLinkUrl}
              </Link>
            </Text>

            <Text style={textMuted}>
              Este link expira em 1 hora. Se você não solicitou este acesso, pode ignorar este email.
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

export default MagicLinkEmail

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
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
}

const logoSection = {
  backgroundColor: '#0E1729',
  padding: '24px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto',
  maxWidth: '220px',
}

const contentSection = {
  padding: '40px 48px',
}

const h1 = {
  color: '#0E1729',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 24px',
  padding: '0',
  lineHeight: '1.2',
  textAlign: 'center' as const,
}

const text = {
  color: '#4b5563',
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
  borderRadius: '12px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
}

const codeSection = {
  textAlign: 'center' as const,
  margin: '16px 0',
}

const codeText = {
  display: 'inline-block',
  padding: '16px 32px',
  backgroundColor: '#F8FAFC',
  borderRadius: '12px',
  border: '1px solid #E2E8F0',
  color: '#0E1729',
  fontSize: '24px',
  fontWeight: '700',
  letterSpacing: '4px',
  fontFamily: 'monospace',
}

const linkText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  wordBreak: 'break-all' as const,
  margin: '0',
}

const link = {
  color: '#0066FF',
  textDecoration: 'none',
}

const footer = {
  backgroundColor: '#f9fafb',
  padding: '32px 40px',
  borderTop: '1px solid #f3f4f6',
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  textAlign: 'center' as const,
}
