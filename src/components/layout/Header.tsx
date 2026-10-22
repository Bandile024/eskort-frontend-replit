interface HeaderProps {
  siteName: string;
}

export function Header({ siteName }: HeaderProps) {
  return (
    <header className="app-header">
      <a className="app-header__brand" href="/" aria-label={siteName}>
        {siteName}
      </a>
    </header>
  );
}
