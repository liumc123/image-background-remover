import type { Metadata } from "next"
import { SessionProvider } from "next-auth/react"
import "./globals.css"

export const metadata: Metadata = {
  title: "RmBg - Remove Image Background",
  description: "Remove image backgrounds with one click. Powered by AI.",
}

function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

// Google Identity Services callback - defined before script loads
const googleCallbackCode = `
window.handleCredentialResponse = function(response) {
  // Store credential for React to pick up
  window.__googleCredential = response.credential;
  // Dispatch event so React components can react
  window.dispatchEvent(new CustomEvent('google-credential', { detail: response }));
};
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Identity Services - load before React hydrates */}
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        />
        {/* Google credential callback - must be defined before GIS loads */}
        <script dangerouslySetInnerHTML={{ __html: googleCallbackCode }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
