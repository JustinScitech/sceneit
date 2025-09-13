import { CreditCard } from 'lucide-react';
import { AmexIcon, DiscoverIcon, MasterCardIcon, VisaIcon } from './icons/cc-icons';

interface CardTypeIconProps {
  cardType: string;
  className?: string;
}

export function CardTypeIcon({ cardType, className = 'w-6 h-6' }: CardTypeIconProps) {
  const Icon = {
    Visa: VisaIcon,
    MasterCard: MasterCardIcon,
    Amex: AmexIcon,
    Discover: DiscoverIcon,
  }[cardType];

  return Icon ? <Icon className={className} /> : <CreditCard className={`${className} opacity-50`} />;
}
