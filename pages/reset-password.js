import React from 'react'

import { Col, Container, Row } from 'reactstrap'

import asNextJSPage from 'app/util/asNextJSPage'
import PasswordReset from 'app/ui/Form/PasswordReset'

class ResetPassword extends React.Component {
  static title = 'Reset Password'
  static authed = false
  render() {
    const { token } = this.props.location.query
    return (
      <div className="app flex-row align-items-center">
        <Container>
          <Row className="justify-content-center">
            <Col md="8" lg="5">
              <PasswordReset token={token} />
            </Col>
          </Row>
        </Container>
      </div>
    )
  }
}

export default asNextJSPage(ResetPassword)
