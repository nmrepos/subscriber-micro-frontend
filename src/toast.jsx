import { useEffect, useState } from 'preact/hooks';

const Toast = ({ message, type, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <article className="toast">
      <p className={type}>{message}</p>
    </article>
  );
};

export default Toast;