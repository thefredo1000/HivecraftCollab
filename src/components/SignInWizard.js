import React from 'react'
import { Box, Header } from '@aragon/ui'
import AccountModuleAlt from './Account/AccountModuleAlt'

/*
  The Signing Wizard manages the view for singing in
  */

class SignInWizard extends React.Component {
  constructor(props) {
    super(props)
    this.discordUserId = 10203012031023
  }

  render() {
    return (
      <div
        css={`
          margin-left: 5%;
          margin-right: 5%;
        `}
      >
        <Box heading="Hivecraft">
          <Header primary="Connect your wallet to Hivecraft" />
          <AccountModuleAlt />

        </Box>
      </div>
    )
  }
}

export default SignInWizard
