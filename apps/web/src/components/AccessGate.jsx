/**
 * 访问密码门禁组件。
 * 应用启动时查询 /api/auth/status，若门禁已启用且本地无有效令牌，
 * 则渲染全屏密码输入框；登录成功后回调通知上层继续渲染应用。
 * @module components/AccessGate
 * @author fxbin
 */

import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api, { setAccessToken, getAccessToken, AUTH_REQUIRED_EVENT } from '../utils/api';

/**
 * 门禁状态：checking 表示正在查询门禁状态，required 表示需要密码，passed 表示已通过。
 */
const GATE_CHECKING = 'checking';
const GATE_REQUIRED = 'required';
const GATE_PASSED = 'passed';

/**
 * 访问密码门禁组件。
 * @param {object} props - 组件属性
 * @param {React.ReactNode} props.children - 门禁通过后渲染的子元素
 * @returns {JSX.Element} 门禁界面或子元素
 * @author fxbin
 */
export default function AccessGate({ children }) {
  const { t } = useTranslation();
  const [gateState, setGateState] = useState(GATE_CHECKING);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const checkGate = async () => {
      try {
        const status = await api.get('/api/auth/status');
        if (ignore) return;
        if (!status.gateEnabled) {
          setGateState(GATE_PASSED);
          return;
        }
        if (getAccessToken()) {
          setGateState(GATE_PASSED);
          return;
        }
        setGateState(GATE_REQUIRED);
      } catch {
        if (!ignore) setGateState(GATE_PASSED);
      }
    };
    checkGate();

    const handleAuthRequired = () => {
      setAccessToken('');
      setGateState(GATE_REQUIRED);
      setError(t('accessGate.tokenExpired', { defaultValue: '登录已过期，请重新输入密码' }));
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => {
      ignore = true;
      window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, [t]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await api.post('/api/auth/login', { password });
      if (result.gateEnabled === false) {
        setGateState(GATE_PASSED);
        return;
      }
      if (result.token) {
        setAccessToken(result.token);
        setGateState(GATE_PASSED);
        return;
      }
      setError(t('accessGate.loginFailed', { defaultValue: '登录失败，请重试' }));
    } catch (err) {
      setError(err.status === 401
        ? t('accessGate.wrongPassword', { defaultValue: '密码错误' })
        : t('accessGate.networkError', { defaultValue: '网络错误，请重试' }));
    } finally {
      setSubmitting(false);
    }
  }

  if (gateState === GATE_CHECKING) {
    return (
      <div className="access-gate-loading">
        <div className="access-gate-spinner" />
      </div>
    );
  }

  if (gateState === GATE_REQUIRED) {
    return (
      <div className="access-gate">
        <form className="access-gate-card" onSubmit={handleSubmit}>
          <div className="access-gate-icon">
            <Lock size={32} />
          </div>
          <h2 className="access-gate-title">
            {t('accessGate.title', { defaultValue: '知径 · 体验入口' })}
          </h2>
          <p className="access-gate-subtitle">
            {t('accessGate.subtitle', { defaultValue: '请输入访问密码以体验 Demo' })}
          </p>
          <input
            type="password"
            className="access-gate-input"
            value={password}
            autoFocus
            autoComplete="current-password"
            placeholder={t('accessGate.placeholder', { defaultValue: '访问密码' })}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />
          {error && <p className="access-gate-error">{error}</p>}
          <button
            type="submit"
            className="access-gate-button"
            disabled={!password || submitting}
          >
            {submitting
              ? t('accessGate.submitting', { defaultValue: '验证中…' })
              : t('accessGate.submit', { defaultValue: '进入体验' })}
          </button>
        </form>
      </div>
    );
  }

  return children;
}
