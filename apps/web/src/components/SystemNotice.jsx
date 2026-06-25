/**
 * 系统通知组件：API 离线时显示提示。
 * @module components/SystemNotice
 */

import { useTranslation } from 'react-i18next';
import { CircleX } from 'lucide-react';

/**
 * API 离线时的系统通知横幅。
 * @returns {JSX.Element} 通知区块
 */
export default function SystemNotice() {
  const { t } = useTranslation();
  return (
    <section className="system-notice">
      <CircleX size={21} />
      <div>
        <strong>{t('system.apiDisconnected')}</strong>
        <p>{t('system.apiDisconnectedHint')}</p>
      </div>
    </section>
  );
}
