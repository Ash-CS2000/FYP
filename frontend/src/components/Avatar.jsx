import { useEffect, useState } from 'react';
import { avatarUrl } from '../api/account';
import { getInitials } from '../utils/user.js';

// One avatar, everywhere.
//
// This replaces four separate treatments that had drifted apart: .sidebar-avatar
// (amber gradient), .avatar (navy gradient), .nav-avatar (flat navy) and a
// hand-rolled 100px circle inside Profile.jsx. Each is kept as a `tone`, so
// nothing changes visually — but photos, initials and the fallback when an image
// fails to load are now decided in one place instead of four.
//
// Sizes are the ones already in use, plus `xl` for the profile page header.
const SIZES = { sm: 24, md: 32, lg: 36, xl: 100 };

/**
 * @param user   the user object — needs id, avatar_key, and a name/email for initials
 * @param size   'sm' | 'md' | 'lg' | 'xl', or a number of pixels
 * @param tone   'navy' (default) | 'amber' | 'flat'
 * @param label  overrides the tooltip/alt text
 */
export default function Avatar({ user, size = 'md', tone = 'navy', label, className = '', ...rest }) {
  const src = avatarUrl(user);
  // Reset when the photo changes, so replacing a broken image with a good one
  // actually shows it rather than staying stuck on initials.
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  const px = typeof size === 'number' ? size : (SIZES[size] || SIZES.md);
  const name = label || user?.display_name || user?.name || user?.email || '';
  const initials = getInitials(user);

  const style = {
    width: px,
    height: px,
    // The initials have to shrink with the circle. Roughly a third of the
    // diameter keeps two letters comfortably inside at every size.
    fontSize: Math.max(10, Math.round(px * 0.36)),
  };

  const classes = `avatar avatar-${tone}${className ? ` ${className}` : ''}`;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile photo` : 'Profile photo'}
        title={name || undefined}
        className={classes}
        style={style}
        // A presigned URL that has gone stale, a deleted object, or no network:
        // fall back to initials rather than showing a broken-image icon.
        onError={() => setFailed(true)}
        {...rest}
      />
    );
  }

  return (
    <span
      className={classes}
      style={style}
      title={name || undefined}
      aria-label={name || undefined}
      {...rest}
    >
      {initials}
    </span>
  );
}
