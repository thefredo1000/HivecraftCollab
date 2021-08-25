import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWallet } from 'use-wallet'
import {
  Button,
  GU,
  IconConnect,
  springs,
  Text,
  IconArrowRight,
} from '@1hive/1hive-ui'
import { Transition, animated } from 'react-spring/renderprops'

import AccountCard from './AccountCard'
import ScreenError from './ScreenError'
import ScreenProvidersAlt from './ScreenProvidersAlt'
import ScreenConnected from './ScreenConnected'
import ScreenConnecting from './ScreenConnecting'
import HeaderPopover from '../Header/HeaderPopover'
import { getUseWalletProviders } from '../../lib/web3-utils'

const axios = require('axios')

var walletAddress
var hnyBal
var plotBal
var discordId = location.pathname.replace(/^\/+|\/+$/g, '');
async function fetchUserData(wallet) {
  walletAddress = wallet.account
  const hnyAddress  = '0x71850b7E9Ee3f13Ab46d67167341E4bDc905Eef9'
  const urlHny = `https://blockscout.com/xdai/mainnet/api?module=account&action=tokenbalance&contractaddress=${hnyAddress}&address=${walletAddress}`
  const plotAddress = '0xaa21065406d0b5ec39776b416fe704e6e01bab60'
  const urlPlot = `https://blockscout.com/xdai/mainnet/api?module=account&action=tokenbalance&contractaddress=${plotAddress}&address=${walletAddress}`
  await axios({
      method: 'get',
      url: urlHny,
  })
  .then(res => {
      // Gets the balance as wei
      hnyBal = res.data.result

  })
  await axios({
    method: 'get',
    url: urlPlot,
  })
  .then(res => {
      plotBal = res.data.result
  })
}

const SCREENS = [
  {
    id: 'providers',
    title: 'xDai Chain Provider',
    height:
      4 * GU + // header
      (12 + 1.5) * GU * (getUseWalletProviders().length / 2) + // buttons
      7 * GU, // footer
  },
  {
    id: 'connecting',
    title: 'xDai Chain Provider',
    height: 38 * GU,
  },
  {
    id: 'connected',
    title: 'Active wallet',
    height: 22 * GU,
  },
  {
    id: 'error',
    title: 'xDai Chain Provider',
    height: 50 * GU,
  },
]

var chainID

function updateChainID(newChainID) {
  chainID = newChainID
}

function changeChain() {
  window.ethereum.request({
    id: 1,
    jsonrpc: '2.0',
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: '0x64',
        chainName: 'xDAI Chain',
        rpcUrls: ['https://dai.poa.network'],
        iconUrls: [
          'https://xdaichain.com/fake/example/url/xdai.svg',
          'https://xdaichain.com/fake/example/url/xdai.png',
        ],
        nativeCurrency: {
          name: 'xDAI',
          symbol: 'xDAI',
          decimals: 18,
        },
        blockExplorerUrls: ['https://blockscout.com/poa/xdai/'],
      },
    ],
  })
}

const AccountModuleAlt = (props, { compact })=> {
  const buttonRef = useRef()
  const wallet = useWallet()
  const [opened, setOpened] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [activatingDelayed, setActivatingDelayed] = useState(false)
  const [activationError, setActivationError] = useState(null)
  const popoverFocusElement = useRef()

  const { account, activating } = wallet
  
  window.$fiatValue = (wallet.balance / (10 ** 18)).toFixed(3)

  const getChainID = {
    jsonrpc: '2.0',
    method: 'eth_chainId',
    params: [],
    id: 0,
  }


  window.ethereum.request(getChainID).then(res => {
    updateChainID(res)
  })
  
  const clearError = useCallback(() => setActivationError(null), [])

  const toggle = useCallback(() => setOpened(opened => !opened), [])

  const handleCancelConnection = useCallback(() => {
    wallet.deactivate()
  }, [wallet])

  const activate = useCallback(
    async providerId => {
      try {
        await wallet.activate(providerId)
      } catch (error) {
        setActivationError(error)
      }
    },
    [wallet]
  )

  // Don’t animate the slider until the popover has opened
  useEffect(() => {
    if (!opened) {
      return
    }
    setAnimate(false)
    const timer = setTimeout(() => {
      setAnimate(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [opened])

  // Always show the “connecting…” screen, even if there are no delay
  useEffect(() => {
    if (activationError) {
      setActivatingDelayed(null)
    }

    if (activating) {
      setActivatingDelayed(activating)
      return
    }

    const timer = setTimeout(() => {
      setActivatingDelayed(null)
    }, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [activating, activationError])

  const previousScreenIndex = useRef(-1)

  const { screenIndex, direction } = useMemo(() => {
    const screenId = (() => {
      if (activationError) return 'error'
      if (activatingDelayed) return 'connecting'
      if (account) return 'connected'
      return 'providers'
    })()

    const screenIndex = SCREENS.findIndex(screen => screen.id === screenId)
    const direction = previousScreenIndex.current > screenIndex ? -1 : 1

    previousScreenIndex.current = screenIndex

    return { direction, screenIndex }
  }, [account, activationError, activatingDelayed])

  const screen = SCREENS[screenIndex]
  const screenId = screen.id

  const handlePopoverClose = useCallback(
    (reject) => {
      if (screenId === 'connecting' || screenId === 'error') {
        // reject closing the popover
        return false
      }
      setOpened(false)
      setActivationError(null)
    },
    [screenId]
  )

  // Prevents to lose the focus on the popover when a screen leaves while an
  // element inside is focused (e.g. when clicking on the “disconnect” button).
  useEffect(() => {
    if (popoverFocusElement.current) {
      popoverFocusElement.current.focus()
    }
  }, [screenId])

  window.ethereum.on('chainChanged', (chainId) =>updateChainID(chainId))

  return (
    <div css="width: 100%">
      <div
        ref={buttonRef}
        tabIndex="0"
        css={`
          display: flex;
          justify-content: space-around;
          outline: 0;
        `}
      >
        {chainID === '0x64' ? (
          screen.id === 'connected' ? (
            <AccountCard />
          ) : (
            <div>
              <Button
                icon={<IconConnect />}
                label="Enable Account"
                onClick={toggle}
                display={compact ? 'icon' : 'all'}
                mode="strong"
                wide
                css={`
                  margin-top: ${2 * GU}px;
                `}
              />
            </div>
          )
        ) : (
          <Button onClick={changeChain}>Change to xDai Network </Button>
        )}

        <HeaderPopover
          animateHeight={animate}
          heading={screen.title}
          height={screen.height}
          width={51 * GU}
          onClose={handlePopoverClose}
          opener={buttonRef.current}
          visible={opened}
        >
          <div ref={popoverFocusElement} tabIndex="0" css="outline: 0">
            <Transition
              native
              immediate={!animate}
              config={springs.smooth}
              items={{
                screen,
                // This is needed because use-wallet throws an error when the
                // activation fails before React updates the state of `activating`.
                // A future version of use-wallet might return an
                // `activationError` object instead, making this unnecessary.
                activating: screen.id === 'error' ? null : activatingDelayed,
                wallet,
              }}
              keys={({ screen }) => screen.id + activatingDelayed}
              from={{
                opacity: 0,
                transform: `translate3d(${3 * GU * direction}px, 0, 0)`,
              }}
              enter={{ opacity: 1, transform: `translate3d(0, 0, 0)` }}
              leave={{
                opacity: 0,
                transform: `translate3d(${3 * GU * -direction}px, 0, 0)`,
              }}
            >
              {({ screen, activating, wallet }) => ({ opacity, transform }) => (
                <animated.div
                  style={{ opacity, transform }}
                  css={`
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                  `}
                >
                  {(() => {
                    if (screen.id === 'connecting') {
                      return (
                        <ScreenConnecting
                          providerId={activating}
                          onCancel={handleCancelConnection}
                        />
                      )
                    }
                    if (screen.id === 'connected') {
                      return <ScreenConnected wallet={wallet} />
                    }
                    if (screen.id === 'error') {
                      return (
                        <ScreenError
                          error={activationError}
                          onBack={clearError}
                        />
                      )
                    }
                    return <ScreenProvidersAlt onActivate={activate} />
                  })()}
                </animated.div>
              )}
            </Transition>
          </div>
        </HeaderPopover>
      </div>
      <br />
      <div css="display: block; padding-left: 75%;">
        {screen.id === 'connected' ? (
          <Button
            icon={<IconArrowRight />}
            display={compact ? 'icon' : 'all'}
            onClick={() => {
              fetchUserData(wallet).then(() => {
                const jsonStr = '{' + '"walletAddress":"' + walletAddress
                + '","hnyBal":' + hnyBal
                + ',"plotBal":'+ plotBal
                + ',"_id":"' + discordId
                + '"}'
                console.log(jsonStr)
                const obj = JSON.parse(jsonStr)
            
                axios.post("http://localhost:8082/user", obj)
                  .then(function (response) {
                    console.log(response);
                  })
                  .catch(function (error) {
                    console.log(error);
                  });
                console.log(obj)
              })
            }}
            label="Connect"
            css="display: flex; justify-content: center; align-items:center;"
          />
        ) : (
          <Text> </Text>
        )}
      </div>
    </div>
  )
}

export default AccountModuleAlt
