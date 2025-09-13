'use client';

import { checkEnvs } from '@/lib/actions';
import { SetupToolbar } from '@joycostudio/v0-setup';

export const V0Setup = () => {
  return (
    <SetupToolbar
      title="V0 Ecommerce Setup"
      description="Setup your V0 ecommerce template"
      envCheckAction={checkEnvs}
    />
  );
};

export default V0Setup;
