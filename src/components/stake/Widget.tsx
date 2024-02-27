import '@stakekit/widget/package/css'
import { SKApp, darkTheme, lightTheme } from '@stakekit/widget'
import useSafeWalletProvider from '../../services/safe-wallet-provider/useSafeWalletProvider'
import { useDarkMode } from '../../hooks/useDarkMode'
import css from './styles.module.css'

export const Widget = () => {
  const wallet = useSafeWalletProvider()
  const darkMode = useDarkMode()

  if (!wallet) return null

  console.log('wallet', wallet)
  return (
    <main className={css.widgetRoot}>
      <SKApp
        theme={darkMode ? darkTheme : lightTheme}
        externalProviders={{ type: 'safe_wallet', provider: wallet }}
        apiKey="3e82ff42-9fc4-49a7-b9b4-66da4d7c0f04"
      />
    </main>
  )
}
