import { ReactNode, Component, ErrorInfo } from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback?.(this.state.error!, this.handleReset) || (
          <Result
            status="error"
            title="Algo deu errado"
            subTitle={this.state.error?.message}
            extra={
              <Button type="primary" onClick={this.handleReset}>
                Tentar novamente
              </Button>
            }
          />
        )
      )
    }

    return this.props.children
  }
}
