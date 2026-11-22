import type { CSSProperties, ReactNode } from 'react';
import {
  assetUrlFor,
  buttonColorVars,
  ELEMENT_LABELS,
  imageCropStyle,
  imageSlides,
  isHttpUrl,
  isValidSocialValue,
  mapEmbedUrl,
  mapLinkUrl,
  resolveTheme,
  SOCIAL_COLORS,
  SOCIAL_LABELS,
  socialHref,
  videoEmbedUrl,
  type AnyElement,
  type ImageRef,
  type Inline,
  type PageContent,
  type ResolvedTheme,
  type ImageSettings,
  type ImageSlide,
  type RichDoc,
} from '../shared';
import { LinkIcon } from './icons';
import { ImageSlider } from './slider';
import { NL_CSS } from './styles';

// رندر صفحه‌ی لینک؛ بدون hook تا هم در Server Component صفحه‌ی عمومی و هم در پیش‌نمایش ویرایشگر کار کند.
// ردیابی کلیک با data-nl-el روی لینک‌ها انجام می‌شود (اسکریپت سبک صفحه‌ی عمومی).

type AssetUrl = (image: ImageRef) => string;

export interface LinkPageProps {
  content: PageContent;
  elements: AnyElement[];
  assetBaseUrl: string;
  forceLicense: boolean;
  /** پیش‌نمایش ویرایشگر: لینک‌ها کلیک نمی‌شوند و المان ناقص جای‌نگهدار دارد. */
  preview?: boolean;
  /** لفاف هر المان (انتخاب در ویرایشگر). */
  wrapElement?: (element: AnyElement, node: ReactNode) => ReactNode;
  /** لفاف بخش پروفایل (ویرایش پروفایل در ویرایشگر). */
  wrapProfile?: (node: ReactNode) => ReactNode;
  brandingHref?: string;
  /** نشانی فرم «گزارش تخلف» (فقط صفحه‌ی عمومی؛ §9.13). */
  reportHref?: string;
  /**
   * رندر آیکون Lucide با نام (norolink به lucide وابسته نیست): صفحه‌ی عمومی در سرور، ویرایشگر پس از بارگذاری
   * تنبل مجموعه‌ی آیکون‌ها. نبودنش یا نام ناشناخته ← جای خالی هم‌اندازه.
   */
  lucideIcon?: (name: string) => ReactNode;
}

const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer nofollow ugc' } as const;

function InlineText({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((i, k) => {
        let node: ReactNode = i.text;
        if (i.bold) node = <strong>{node}</strong>;
        if (i.italic) node = <em>{node}</em>;
        if (i.href) node = <a href={i.href} {...EXTERNAL}>{node}</a>;
        return <span key={k}>{node}</span>;
      })}
    </>
  );
}

export function RichText({ doc }: { doc: RichDoc }) {
  return (
    <div className="nl-text">
      {doc.blocks.map((b, k) => {
        if (b.type === 'h') {
          const H = (`h${b.level}` as const);
          return (
            <H key={k}>
              <InlineText content={b.content} />
            </H>
          );
        }
        if (b.type === 'p') {
          return (
            <p key={k}>
              <InlineText content={b.content} />
            </p>
          );
        }
        const List = b.type;
        return (
          <List key={k}>
            {b.items.map((it, j) => (
              <li key={j}>
                <InlineText content={it} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return <div className="nl-placeholder">{label}</div>;
}

/** یک تصویر (تکی یا اسلاید) با کادر و لینک اختیاری. `ratio` برای اسلایدر با نسبت «اصلی». */
function ImageMedia({
  slide,
  aspect,
  ratio,
  assetUrl,
  elementId,
  eager = false,
}: {
  slide: ImageSlide;
  aspect: ImageSettings['aspect'];
  ratio?: string;
  assetUrl: AssetUrl;
  elementId: string;
  eager?: boolean;
}) {
  const fixed = aspect !== 'auto' || ratio !== undefined;
  const img = (
    <img
      src={assetUrl(slide.image)}
      alt={slide.alt}
      width={slide.image.width}
      height={slide.image.height}
      loading={eager ? undefined : 'lazy'}
      decoding="async"
      style={imageCropStyle(fixed ? (aspect === 'auto' ? 'custom' : aspect) : 'auto', slide.crop) as CSSProperties}
    />
  );
  const attrs = { className: 'nl-media', 'data-aspect': fixed ? (aspect === 'auto' ? 'custom' : aspect) : undefined, style: ratio ? { aspectRatio: ratio } : undefined };
  return isHttpUrl(slide.link) ? (
    <a {...attrs} href={slide.link} data-nl-el={elementId} {...EXTERNAL}>
      {img}
    </a>
  ) : (
    <div {...attrs}>{img}</div>
  );
}

function ElementView({
  el,
  assetUrl,
  theme,
  preview,
  lucideIcon,
}: {
  el: AnyElement;
  assetUrl: AssetUrl;
  theme: ResolvedTheme;
  preview: boolean;
  lucideIcon?: (name: string) => ReactNode;
}) {
  switch (el.kind) {
    case 'link_button': {
      const s = el.settings;
      // فقط لینک معتبر href می‌شود (پیش‌نویس ممکن است لینک ناقص داشته باشد؛ انتشار آن را رد می‌کند)
      const href = isHttpUrl(s.url) ? s.url : undefined;
      if (!href && !preview) return null;
      const style = s.style.bg_color ? (buttonColorVars(s.style.bg_color, theme) as CSSProperties) : undefined;
      const icon = s.icon ? (
        <span className="nl-btn-icon">
          {s.icon.kind === 'preset' ? (
            <LinkIcon name={s.icon.value} />
          ) : s.icon.kind === 'lucide' ? (
            lucideIcon?.(s.icon.value)
          ) : (
            <img src={assetUrl(s.icon.image)} alt="" />
          )}
        </span>
      ) : null;
      return (
        <a
          className={`nl-btn nl-btn--${theme.buttonStyle}`}
          href={href}
          style={style}
          data-nl-el={s.track_clicks ? el.id : undefined}
          {...(s.open_in_new_tab ? EXTERNAL : { rel: 'noopener nofollow ugc' })}
        >
          {icon ?? <span className="nl-btn-spacer" />}
          <span className="nl-btn-label">{s.label || ELEMENT_LABELS.link_button}</span>
          <span className="nl-btn-spacer" />
        </a>
      );
    }
    case 'social_icons': {
      const items = el.settings.items.filter((i) => i.value && isValidSocialValue(i.platform, i.value));
      if (!items.length) return preview ? <Placeholder label="شبکه‌های اجتماعی را اضافه کنید" /> : null;
      return (
        <div className="nl-social">
          {items.map((i, k) => (
            <a
              key={k}
              className="nl-social-item"
              href={socialHref(i.platform, i.value)}
              data-nl-el={el.id}
              {...(i.platform === 'email' || i.platform === 'phone' ? {} : EXTERNAL)}
            >
              <span className="nl-social-circle" style={{ '--nl-social-bg': SOCIAL_COLORS[i.platform] } as CSSProperties}>
                <LinkIcon name={i.platform} />
              </span>
              <span className="nl-social-label">{SOCIAL_LABELS[i.platform]}</span>
            </a>
          ))}
        </div>
      );
    }
    case 'rich_text':
      return <RichText doc={el.settings.doc} />;
    case 'image': {
      const s = el.settings;
      const slides = imageSlides(s);
      if (!slides.length) return preview ? <Placeholder label="تصویر را آپلود کنید" /> : null;
      if (slides.length === 1) return <ImageMedia slide={slides[0]!} aspect={s.aspect} assetUrl={assetUrl} elementId={el.id} />;
      // اسلایدر: همه با یک نسبت (نسبت «اصلی» = نسبت تصویر اول) تا ارتفاع هنگام کشیدن نپرد
      const first = slides[0]!.image;
      const ratio = s.aspect === 'auto' ? `${first.width} / ${first.height}` : undefined;
      return (
        <ImageSlider
          slides={slides.map((slide, i) => (
            <ImageMedia key={i} slide={slide} aspect={s.aspect} ratio={ratio} assetUrl={assetUrl} elementId={el.id} eager={i === 0} />
          ))}
        />
      );
    }
    case 'video_embed': {
      const v = el.settings.video;
      if (!v) return preview ? <Placeholder label="لینک ویدیو (آپارات، یوتیوب، ویمیو) را وارد کنید" /> : null;
      return (
        <div className="nl-media nl-embed">
          <iframe
            src={videoEmbedUrl(v)}
            title="ویدیو"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      );
    }
    case 'map_embed': {
      const s = el.settings;
      if (!s.location) return preview ? <Placeholder label="لینک یا کد iframe مکان در گوگل‌مپ، نشان یا بلد را وارد کنید" /> : null;
      const providerName = { google: 'گوگل‌مپ', neshan: 'نشان', balad: 'بلد' }[s.location.provider];
      return (
        <div>
          <div className="nl-media nl-map" data-height={s.height}>
            <iframe src={mapEmbedUrl(s.location)} title={s.label || 'نقشه'} loading="lazy" referrerPolicy="no-referrer" />
          </div>
          <div className="nl-map-bar">
            <span>{s.label}</span>
            <a href={mapLinkUrl(s.source_url, s.location)} data-nl-el={el.id} {...EXTERNAL}>
              مسیریابی با {providerName}
            </a>
          </div>
        </div>
      );
    }
  }
}

export function LinkPage({
  content,
  elements,
  assetBaseUrl,
  forceLicense,
  preview = false,
  wrapElement,
  wrapProfile,
  brandingHref = 'https://noroset.com',
  reportHref,
  lucideIcon,
}: LinkPageProps) {
  const assetUrl = assetUrlFor(assetBaseUrl);
  const theme = resolveTheme(content.theme, assetUrl);
  const { profile } = content;
  const initial = profile.name.trim().charAt(0);

  const profileNode = (
    <header className={`nl-profile nl-profile--${profile.layout}`}>
      <div className="nl-avatar">{profile.avatar ? <img src={assetUrl(profile.avatar)} alt={profile.name} /> : initial}</div>
      <div className="nl-profile-text">
        {profile.name ? <h1 className="nl-name">{profile.name}</h1> : null}
        {profile.bio ? <p className="nl-bio">{profile.bio}</p> : null}
      </div>
    </header>
  );

  return (
    // .nl-frame قاب container است تا توکن‌های اندازه‌ی .nl-root (حتی padding خودش) از عرض صفحه حساب شوند
    <div className={preview ? 'nl-frame nl-preview' : 'nl-frame'}>
      <style>{NL_CSS}</style>
      {theme.image ? (
        // عکس پس‌زمینه در لایه‌ی جدا: محو، چسبان به بالای صفحه هنگام اسکرول و با لایه‌ی شیشه‌ای روشن/تیره
        <div className="nl-bg" aria-hidden="true" style={{ background: theme.image.fallback }}>
          <div
            className="nl-bg-sticky"
            style={{ ['--nl-bg-tint' as string]: theme.image.tint, ['--nl-bg-amount' as string]: theme.image.amount } as CSSProperties}
          >
            <img src={theme.image.url} alt="" decoding="async" style={{ objectPosition: theme.image.position }} />
          </div>
        </div>
      ) : null}
      <div className={theme.card ? 'nl-root nl-root--card' : 'nl-root'} style={theme.vars as CSSProperties} lang="fa" dir="rtl">
        <main className="nl-page">
          {wrapProfile ? wrapProfile(profileNode) : profileNode}
          {elements.map((el, i) => {
            const node = <ElementView el={el} assetUrl={assetUrl} theme={theme} preview={preview} lucideIcon={lucideIcon} />;
            // بین دو نوع متفاوت فاصله‌ی بیشتر (گروه‌بندی بصری)؛ المان‌های هم‌نوع پشت سر هم نزدیک می‌مانند
            const breakBefore = i > 0 && elements[i - 1]!.kind !== el.kind;
            return (
              <div key={el.id} className={breakBefore ? 'nl-el--break' : undefined}>
                {wrapElement ? wrapElement(el, node) : node}
              </div>
            );
          })}
        </main>
        {forceLicense || reportHref ? (
          <footer className="nl-footer">
            {forceLicense ? (
              <a href={brandingHref} dir="ltr" {...EXTERNAL}>
                Powered by Noroset
              </a>
            ) : null}
            {reportHref ? (
              <a href={reportHref} className="nl-report" rel="nofollow noopener" target="_blank">
                گزارش تخلف
              </a>
            ) : null}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
