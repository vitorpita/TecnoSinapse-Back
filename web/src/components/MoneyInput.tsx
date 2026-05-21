import type { ReactNode } from 'react'
import { InputNumber } from 'antd'
import type { InputNumberProps } from 'antd'

type MoneyInputProps = Omit<
  InputNumberProps<number>,
  'formatter' | 'parser' | 'precision' | 'decimalSeparator' | 'prefix'
> & { prefix?: ReactNode }

const moneyFormatter = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return ''
  const str = String(value)
  const [int, dec] = str.split('.')
  const thousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec !== undefined ? `${thousands},${dec}` : thousands
}

const moneyParser = (value: string | undefined): number => {
  if (!value) return 0
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

export function MoneyInput({ min = 0, step = 0.01, prefix = 'R$', ...rest }: MoneyInputProps) {
  return (
    <InputNumber<number>
      {...rest}
      prefix={prefix}
      min={min as number}
      step={step}
      precision={2}
      decimalSeparator=","
      formatter={moneyFormatter}
      parser={moneyParser}
    />
  )
}
