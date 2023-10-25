import { MPCWalletState } from '@/hooks/wallets/mpc/useMPCWallet'
import { Box, Button, SvgIcon, Typography } from '@mui/material'
import { useCallback, useContext, useMemo } from 'react'
import { MpcWalletContext } from './MPCWalletProvider'
import { PasswordRecovery } from './PasswordRecovery'
import GoogleLogo from '@/public/images/welcome/logo-google.svg'
import InfoIcon from '@/public/images/notifications/info.svg'

import css from './styles.module.css'
import useWallet from '@/hooks/wallets/useWallet'
import Track from '../Track'
import { CREATE_SAFE_EVENTS } from '@/services/analytics'
import { MPC_WALLET_EVENTS } from '@/services/analytics/events/mpcWallet'
import useChains, { useCurrentChain } from '@/hooks/useChains'
import { isSocialWalletEnabled } from '@/hooks/wallets/wallets'
import { isSocialLoginWallet, ONBOARD_MPC_MODULE_LABEL } from '@/services/mpc/SocialLoginModule'
import { CGW_NAMES } from '@/hooks/wallets/consts'
import { type ChainInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { TxModalContext } from '@/components/tx-flow'
import { COREKIT_STATUS } from '@web3auth/mpc-core-kit'
import useSocialWallet from '@/hooks/wallets/mpc/useSocialWallet'
import useOnboard, { connectWallet } from '@/hooks/wallets/useOnboard'
import useAddressBook from '@/hooks/useAddressBook'
import useChainId from '@/hooks/useChainId'
import { useAppDispatch } from '@/store'
import { checksumAddress } from '@/utils/addresses'
import { upsertAddressBookEntry } from '@/store/addressBookSlice'

export const _getSupportedChains = (chains: ChainInfo[]) => {
  return chains
    .filter((chain) => CGW_NAMES.SOCIAL_LOGIN && !chain.disabledWallets.includes(CGW_NAMES.SOCIAL_LOGIN))
    .map((chainConfig) => chainConfig.chainName)
}
const useGetSupportedChains = () => {
  const chains = useChains()

  return useMemo(() => {
    return _getSupportedChains(chains.configs)
  }, [chains.configs])
}

const useIsSocialWalletEnabled = () => {
  const currentChain = useCurrentChain()

  return isSocialWalletEnabled(currentChain)
}

const MPCLogin = ({ onLogin }: { onLogin?: () => void }) => {
  const socialWalletService = useSocialWallet()
  const { userInfo, walletState, setWalletState } = useContext(MpcWalletContext)
  const { setTxFlow } = useContext(TxModalContext)
  const onboard = useOnboard()
  const addressBook = useAddressBook()
  const currentChainId = useChainId()
  const dispatch = useAppDispatch()

  const wallet = useWallet()
  const loginPending = walletState === MPCWalletState.AUTHENTICATING

  const supportedChains = useGetSupportedChains()
  const isMPCLoginEnabled = useIsSocialWalletEnabled()

  const isDisabled = loginPending || !isMPCLoginEnabled

  const onConnect = useCallback(async () => {
    if (!onboard || !socialWalletService) return

    const wallets = await connectWallet(onboard, {
      autoSelect: {
        label: ONBOARD_MPC_MODULE_LABEL,
        disableModals: true,
      },
    }).catch((reason) => console.error('Error connecting to MPC module:', reason))

    // If the signer is not in the address book => add the user's email as name
    if (wallets && currentChainId && wallets.length > 0) {
      const address = wallets[0].accounts[0]?.address
      if (address) {
        const signerAddress = checksumAddress(address)
        if (addressBook[signerAddress] === undefined) {
          const email = socialWalletService.getUserInfo().email
          dispatch(upsertAddressBookEntry({ address: signerAddress, chainId: currentChainId, name: email }))
        }
      }
    }
  }, [addressBook, currentChainId, dispatch, onboard, socialWalletService])

  const recoverPassword = useCallback(
    async (password: string, storeDeviceFactor: boolean) => {
      if (!socialWalletService) return

      const success = await socialWalletService.recoverAccountWithPassword(onConnect, password, storeDeviceFactor)

      if (success) {
        onLogin?.()
        setTxFlow(undefined)
      }
    },
    [onConnect, onLogin, setTxFlow, socialWalletService],
  )

  const login = async () => {
    if (!socialWalletService) return

    const status = await socialWalletService.loginAndCreate(onConnect)

    if (status === COREKIT_STATUS.LOGGED_IN) {
      onLogin?.()
    }

    if (status === COREKIT_STATUS.REQUIRED_SHARE) {
      setTxFlow(
        <PasswordRecovery recoverFactorWithPassword={recoverPassword} onSuccess={onLogin} />,
        () => setWalletState(MPCWalletState.NOT_INITIALIZED),
        false,
      )
    }
  }

  const isSocialLogin = isSocialLoginWallet(wallet?.label)

  return (
    <>
      <Box sx={{ width: '100%' }}>
        {isSocialLogin && userInfo ? (
          <Track {...CREATE_SAFE_EVENTS.CONTINUE_TO_CREATION}>
            <Button
              variant="outlined"
              sx={{ px: 2, py: 1, borderWidth: '1px !important' }}
              onClick={onLogin}
              size="small"
              disabled={isDisabled}
              fullWidth
            >
              <Box width="100%" display="flex" flexDirection="row" alignItems="center" gap={1}>
                <img
                  src={userInfo.profileImage}
                  className={css.profileImg}
                  alt="Profile Image"
                  referrerPolicy="no-referrer"
                />
                <div className={css.profileData}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Continue as {userInfo.name}
                  </Typography>
                  <Typography variant="body2">{userInfo.email}</Typography>
                </div>
                <SvgIcon component={GoogleLogo} inheritViewBox fontSize="medium" sx={{ marginLeft: 'auto' }} />
              </Box>
            </Button>
          </Track>
        ) : (
          <Track {...MPC_WALLET_EVENTS.CONNECT_GOOGLE}>
            <Button
              variant="outlined"
              onClick={login}
              size="small"
              disabled={isDisabled}
              fullWidth
              sx={{ borderWidth: '1px !important' }}
            >
              <Box display="flex" flexDirection="row" alignItems="center" gap={1}>
                <SvgIcon component={GoogleLogo} inheritViewBox fontSize="medium" /> Continue with Google
              </Box>
            </Button>
          </Track>
        )}
      </Box>

      {!isMPCLoginEnabled && (
        <Typography variant="body2" color="text.secondary" display="flex" gap={1} alignItems="center">
          <SvgIcon
            component={InfoIcon}
            inheritViewBox
            color="border"
            fontSize="small"
            sx={{
              verticalAlign: 'middle',
              ml: 0.5,
            }}
          />
          Currently only supported on {supportedChains.join(', ')}
        </Typography>
      )}
    </>
  )
}

export default MPCLogin
