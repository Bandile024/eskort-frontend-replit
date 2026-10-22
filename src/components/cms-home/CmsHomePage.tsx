import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type {
  CategoryContainerBlock,
  ContentBlock,
  GeneralSliderContainerBlock,
  HeaderSliderContainerBlock,
  HomePageItem,
  InfoImageItemBlock,
  PromotionBannerContainerBlock,
  SocialEngagementCardContainerBlock,
  StickerSliderContainerBlock,
} from '../../types/contentBlocks';
import type { CollectionPage, ProductPage, RecipeDetail } from '../../types/contentTypes';
import type { ApiLink } from '../../types/umbraco';
import { cmsContentUrl, firstLink, resolveLink } from '../../utils/links';
import { firstMedia, focalPointStyle, resolveAssetUrl } from '../../utils/media';
import { totalTime } from '../../utils/time';
import './cms-home.css';

export interface CmsHomePageProps {
  page: HomePageItem | null;
  collectionPages: ReadonlyMap<string, CollectionPage>;
  productPages: ReadonlyMap<string, ProductPage>;
  recipeDetails: ReadonlyMap<string, RecipeDetail>;
}

function linkHref(link: ApiLink): { href: string; external: boolean } | null {
  const resolved = resolveLink(link);
  if (!resolved) return null;
  if (resolved.external) return { href: resolved.href, external: true };
  if (resolved.href === '/') return { href: '/', external: false };
  return {
    href: cmsContentUrl(resolved.href) ?? resolved.href,
    external: /^https?:\/\//i.test(cmsContentUrl(resolved.href) ?? ''),
  };
}

function CmsAction({
  links,
  variant = 'solid',
}: {
  links: ApiLink[] | null | undefined;
  variant?: 'solid' | 'outline';
}) {
  const link = firstLink(links);
  if (!link || !link.title) return null;
  const destination = linkHref(link);
  if (!destination) return null;
  const target = link.target ?? undefined;

  return (
    <a
      className={`cms-home__action${variant === 'outline' ? ' cms-home__action--outline' : ''}`}
      href={destination.href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    >
      <span>{link.title}</span>
      <ArrowDownRight aria-hidden="true" size={16} strokeWidth={2.5} />
    </a>
  );
}

function HeadingPair({
  first,
  second,
}: {
  first: string | null | undefined;
  second: string | null | undefined;
}) {
  return (
    <div className="cms-home__section-title-group">
      {first && <h2 className="cms-home__heading">{first}</h2>}
      {second && <p className="cms-home__heading cms-home__heading--script">{second}</p>}
    </div>
  );
}

function SectionIntro({
  titleOne,
  titleTwo,
  subTitle,
  centered = false,
}: {
  titleOne: string;
  titleTwo: string;
  subTitle?: string | null;
  centered?: boolean;
}) {
  return (
    <div className={`cms-home__section-top${centered ? ' cms-home__section-top--center' : ''}`}>
      <div className="cms-home__section-title-group">
        <HeadingPair first={titleOne} second={titleTwo} />
        {subTitle && <p className="cms-home__intro">{subTitle}</p>}
      </div>
    </div>
  );
}

function ScrollTrack({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: (direction === 'left' ? -1 : 1) * Math.max(250, track.clientWidth * 0.72), behavior: 'smooth' });
  };

  return (
    <div className="cms-home__scroller-wrap">
      <button
        className="cms-home__icon-button cms-home__scroll-control cms-home__scroll-control--left"
        type="button"
        onClick={() => scroll('left')}
        aria-label={`Scroll ${label} left`}
      >
        <ChevronLeft aria-hidden="true" size={20} />
      </button>
      <div className="cms-home__scroller" ref={trackRef} aria-label={label}>
        {children}
      </div>
      <button
        className="cms-home__icon-button cms-home__scroll-control cms-home__scroll-control--right"
        type="button"
        onClick={() => scroll('right')}
        aria-label={`Scroll ${label} right`}
      >
        <ChevronRight aria-hidden="true" size={20} />
      </button>
    </div>
  );
}

function HeroSection({ block }: { block: HeaderSliderContainerBlock }) {
  const items = block.properties.items.items;
  const [activeIndex, setActiveIndex] = useState(0);
  if (!items.length) return null;
  const active = items[activeIndex]?.content;
  if (!active) return null;
  const props = active.properties;
  const media = firstMedia(props.image);
  const mediaUrl = props.useImage ? resolveAssetUrl(media?.url) : resolveAssetUrl(props.videoUrl);
  const stickers = props.useStickers ? props.stickers ?? [] : [];
  const previous = () => setActiveIndex((index) => (index - 1 + items.length) % items.length);
  const next = () => setActiveIndex((index) => (index + 1) % items.length);

  return (
    <section className="cms-home__hero" aria-roledescription="carousel" aria-label={props.titleOne || 'Homepage feature'}>
      {mediaUrl && (
        <div className="cms-home__hero-media">
          {props.useImage ? (
            <img
              src={mediaUrl}
              alt={props.imageAltText || media?.name || ''}
              style={media ? focalPointStyle(media) : undefined}
              fetchPriority="high"
            />
          ) : (
            <video src={mediaUrl} aria-label={props.videoAltText || props.titleOne || ''} controls muted playsInline />
          )}
        </div>
      )}
      <div className="cms-home__hero-content" key={active.id}>
        {props.titleOne && <h1 className="cms-home__hero-title">{props.titleOne}</h1>}
        {props.titleTwo && <span className="cms-home__hero-title cms-home__hero-title--script">{props.titleTwo}</span>}
        {props.subTitle && <p className="cms-home__hero-subtitle">{props.subTitle}</p>}
        {(props.buttonOne?.length || props.buttonTwo?.length) && (
          <div className="cms-home__actions">
            <CmsAction links={props.buttonOne} />
            <CmsAction links={props.buttonTwo} variant="outline" />
          </div>
        )}
      </div>
      {stickers.length > 0 && (
        <div className="cms-home__hero-stickers" aria-hidden="true">
          {stickers.map((sticker) => {
            const src = resolveAssetUrl(sticker.url);
            return src ? <img key={sticker.id} src={src} alt="" /> : null;
          })}
        </div>
      )}
      {items.length > 1 && (
        <div className="cms-home__carousel-controls" aria-label="Homepage feature controls">
          <div className="cms-home__hero-dots">
            {items.map((item, index) => (
              <button
                key={item.content.id}
                type="button"
                className="cms-home__hero-dot"
                aria-label={`Show slide ${index + 1}`}
                aria-current={activeIndex === index}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <button className="cms-home__icon-button" type="button" aria-label="Previous slide" onClick={previous}>
            <ChevronLeft aria-hidden="true" size={19} />
          </button>
          <button className="cms-home__icon-button" type="button" aria-label="Next slide" onClick={next}>
            <ChevronRight aria-hidden="true" size={19} />
          </button>
        </div>
      )}
    </section>
  );
}

function CategoriesSection({
  block,
  collectionPages,
}: {
  block: CategoryContainerBlock;
  collectionPages: ReadonlyMap<string, CollectionPage>;
}) {
  const categories = block.properties.categories;
  return (
    <section className="cms-home__section cms-home__section--paper">
      <SectionIntro titleOne={block.properties.titleOne} titleTwo={block.properties.titleTwo} centered />
      {categories.length > 0 && (
        <ScrollTrack label="Shop categories">
          {categories.map((reference) => {
            const category = collectionPages.get(reference.id) ?? reference;
            const logo = firstMedia(category.properties.logo);
            const image = firstMedia(category.properties.image) ?? logo;
            const src = resolveAssetUrl(image?.url);
            const href = cmsContentUrl(category.properties.redirectUrl || category.route?.path);
            if (!href) return null;
            const alt = category.properties.logoAltText || category.name || image?.name || '';
            return (
              <a className="cms-home__category-card" href={href} key={category.id}>
                <div className="cms-home__category-image">
                  {src && (
                    <img
                      src={src}
                      alt={alt}
                      style={image ? focalPointStyle(image) : undefined}
                      loading="lazy"
                    />
                  )}
                </div>
                <span className="cms-home__category-name">{category.name}</span>
              </a>
            );
          })}
        </ScrollTrack>
      )}
    </section>
  );
}

function StickerStrip({ block }: { block: StickerSliderContainerBlock }) {
  const stickers = block.properties.stickers.items;
  if (!stickers.length) return null;
  return (
    <div className="cms-home__sticker-strip" aria-label="Brand artwork">
      <div className="cms-home__sticker-track">
        {stickers.map(({ content }) => {
          const media = firstMedia(content.properties.sticker);
          const src = resolveAssetUrl(media?.url);
          return src ? (
            <img
              key={content.id}
              src={src}
              alt={content.properties.stickerAltText || media?.name || ''}
              loading="lazy"
            />
          ) : null;
        })}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ProductPage }) {
  const image = firstMedia(product.properties.promoImage) ?? firstMedia(product.properties.images);
  const src = resolveAssetUrl(image?.url);
  const href = cmsContentUrl(product.route?.path);
  if (!href) return null;
  const price = product.properties.salePrice?.formatted?.withTax
    || product.properties.price?.formatted?.withTax;

  return (
    <a className="cms-home__product-card" href={href} key={product.id}>
      <div className="cms-home__card-image">
        {src && (
          <img
            src={src}
            alt={product.properties.promoImageAltText || product.name || image?.name || ''}
            style={image ? focalPointStyle(image) : undefined}
            loading="lazy"
          />
        )}
      </div>
      <div className="cms-home__card-copy">
        <p className="cms-home__card-kicker">{product.properties.additionalCategories?.[0]?.name}</p>
        <h3 className="cms-home__card-title">{product.name}</h3>
        {product.properties.shortDescription && (
          <p className="cms-home__card-description">{product.properties.shortDescription}</p>
        )}
        {price && <p className="cms-home__card-meta">{price}</p>}
      </div>
    </a>
  );
}

function RecipeCard({ recipe }: { recipe: RecipeDetail }) {
  const image = firstMedia(recipe.properties.headerImageMobile) ?? firstMedia(recipe.properties.headerImage);
  const src = resolveAssetUrl(image?.url);
  const href = cmsContentUrl(recipe.route?.path);
  if (!href) return null;
  const time = totalTime(recipe.properties.cookTime, recipe.properties.prepTime);

  return (
    <a className="cms-home__recipe-card" href={href} key={recipe.id}>
      <div className="cms-home__card-image">
        {src && (
          <img
            src={src}
            alt={recipe.properties.headerImageAltText || recipe.name || image?.name || ''}
            style={image ? focalPointStyle(image) : undefined}
            loading="lazy"
          />
        )}
      </div>
      <div className="cms-home__card-copy">
        <p className="cms-home__card-kicker">{recipe.properties.categories?.[0]}</p>
        <h3 className="cms-home__card-title">{recipe.properties.title || recipe.name}</h3>
        {recipe.properties.subTitle && <p className="cms-home__card-description">{recipe.properties.subTitle}</p>}
        {time && <p className="cms-home__card-meta">{time}</p>}
      </div>
    </a>
  );
}

function GeneralSlider({
  block,
  productPages,
  recipeDetails,
}: {
  block: GeneralSliderContainerBlock;
  productPages: ReadonlyMap<string, ProductPage>;
  recipeDetails: ReadonlyMap<string, RecipeDetail>;
}) {
  const { properties } = block;
  const items = properties.items.items;
  const sticker = firstMedia(properties.stickers);
  const stickerUrl = resolveAssetUrl(sticker?.url);
  const allCards = items.flatMap(({ content }) => {
    const contentProps = content.properties;
    if (contentProps.products?.length) {
      return contentProps.products.map((reference) => {
        const product = productPages.get(reference.id) ?? reference;
        return <ProductCard key={product.id} product={product as ProductPage} />;
      });
    }
    if (contentProps.recipes?.length) {
      return contentProps.recipes.map((reference) => {
        const recipe = recipeDetails.get(reference.id) ?? reference;
        return <RecipeCard key={recipe.id} recipe={recipe as RecipeDetail} />;
      });
    }
    return [];
  });
  if (!properties.titleOne && !properties.titleTwo && !allCards.length && !stickerUrl) return null;

  return (
    <section className="cms-home__section">
      <SectionIntro
        titleOne={properties.titleOne}
        titleTwo={properties.titleTwo}
        subTitle={properties.subTitle}
      />
      {stickerUrl && (
        <img
          src={stickerUrl}
          alt={properties.stickerAltText || sticker?.name || ''}
          style={sticker ? { ...focalPointStyle(sticker), maxWidth: '9rem', maxHeight: '7rem', objectFit: 'contain', marginBottom: '1.5rem' } : undefined}
          loading="lazy"
        />
      )}
      {allCards.length > 0 && <ScrollTrack label={properties.titleOne || properties.titleTwo || 'Featured content'}>{allCards}</ScrollTrack>}
      <div className="cms-home__actions">
        <CmsAction links={properties.button} variant="outline" />
      </div>
    </section>
  );
}

function PromotionBanner({ block }: { block: PromotionBannerContainerBlock }) {
  const items = block.properties.items.items;
  if (!items.length) return null;
  return (
    <section className="cms-home__promo-stack" aria-label="Promotional artwork">
      {items.map(({ content }) => {
        const props = content.properties;
        const desktop = firstMedia(props.image);
        const mobile = firstMedia(props.mobileImage);
        const desktopUrl = resolveAssetUrl(desktop?.url);
        const mobileUrl = resolveAssetUrl(mobile?.url);
        if (!desktopUrl && !mobileUrl) return null;
        const alt = props.imageAltText || props.mobileImageAltText || desktop?.name || mobile?.name || '';
        return (
          <div className={`cms-home__promo${props.backgroundColour === 'Purple' ? ' cms-home__promo--purple' : ''}`} key={content.id}>
            <picture>
              {mobileUrl && <source media="(max-width: 767px)" srcSet={mobileUrl} />}
              <img
                src={desktopUrl || mobileUrl}
                alt={alt}
                style={desktop ? focalPointStyle(desktop) : mobile ? focalPointStyle(mobile) : undefined}
                loading="lazy"
              />
            </picture>
          </div>
        );
      })}
    </section>
  );
}

function InfoImage({ block }: { block: InfoImageItemBlock }) {
  const { properties } = block;
  const media = firstMedia(properties.image);
  const src = resolveAssetUrl(media?.url);
  return (
    <section className={`cms-home__info${properties.layout === 'Recipe Layout' ? ' cms-home__info--recipe' : ''}`}>
      <div className="cms-home__info-media">
        {src && (
          <img
            src={src}
            alt={properties.imageAltText || media?.name || ''}
            style={media ? focalPointStyle(media) : undefined}
            loading="lazy"
          />
        )}
      </div>
      <div className="cms-home__info-copy">
        <HeadingPair first={properties.titleOne} second={properties.titleTwo} />
        {properties.subTitle && <p className="cms-home__intro">{properties.subTitle}</p>}
        <div className="cms-home__actions">
          <CmsAction links={properties.button} />
        </div>
      </div>
    </section>
  );
}

function SocialCards({ block }: { block: SocialEngagementCardContainerBlock }) {
  const items = block.properties.items.items;
  if (!items.length) return null;
  return (
    <section className="cms-home__section cms-home__section--paper">
      <div className="cms-home__social-grid">
        {items.map(({ content }) => {
          const props = content.properties;
          const image = firstMedia(props.image);
          const sticker = firstMedia(props.sticker);
          const imageUrl = props.useImage ? resolveAssetUrl(image?.url) : undefined;
          const videoUrl = !props.useImage ? resolveAssetUrl(props.videoUrl) : undefined;
          const stickerUrl = props.useStickers ? resolveAssetUrl(sticker?.url) : undefined;
          return (
            <article className="cms-home__social-card" key={content.id}>
              {(imageUrl || videoUrl) && (
                <div className="cms-home__social-media">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={props.imageAltText || image?.name || ''}
                      style={image ? focalPointStyle(image) : undefined}
                      loading="lazy"
                    />
                  )}
                  {videoUrl && <video src={videoUrl} aria-label={props.videoAltText || props.titleOne || ''} controls playsInline />}
                  {stickerUrl && <img className="cms-home__social-sticker" src={stickerUrl} alt={sticker?.name || ''} />}
                </div>
              )}
              <div className="cms-home__social-copy">
                {props.badge && <span className="cms-home__social-badge">{props.badge}</span>}
                {(props.titleOne || props.titleTwo) && (
                  <h2 className="cms-home__social-title">{[props.titleOne, props.titleTwo].filter(Boolean).join(' ')}</h2>
                )}
                {props.body && <p className="cms-home__social-body">{props.body}</p>}
                <div className="cms-home__actions">
                  <CmsAction links={props.button} variant="outline" />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FindEskort({ block }: { block: ContentBlock & { contentType: 'findEskortBlock' } }) {
  const { properties } = block;
  const sticker = firstMedia(properties.sticker);
  const stickerUrl = resolveAssetUrl(sticker?.url);
  return (
    <section className="cms-home__section cms-home__find">
      <div>
        <HeadingPair first={properties.titleOne} second={properties.titleTwo} />
        <div className="cms-home__find-actions">
          <CmsAction links={properties.buttonOne} />
          <CmsAction links={properties.buttonTwo} variant="outline" />
          <CmsAction links={properties.buttonThree} variant="outline" />
        </div>
      </div>
      {stickerUrl && <img className="cms-home__find-sticker" src={stickerUrl} alt={sticker?.name || ''} loading="lazy" />}
    </section>
  );
}

function renderBlock(
  block: ContentBlock,
  maps: {
    collectionPages: ReadonlyMap<string, CollectionPage>;
    productPages: ReadonlyMap<string, ProductPage>;
    recipeDetails: ReadonlyMap<string, RecipeDetail>;
  },
) {
  switch (block.contentType) {
    case 'headerSliderContainer':
      return <HeroSection block={block} />;
    case 'categoryContainer':
      return <CategoriesSection block={block} collectionPages={maps.collectionPages} />;
    case 'stickerSliderContainer':
      return <StickerStrip block={block} />;
    case 'generalSliderContainer':
      return <GeneralSlider block={block} productPages={maps.productPages} recipeDetails={maps.recipeDetails} />;
    case 'promotionBannerContainer':
      return <PromotionBanner block={block} />;
    case 'infoImageItemBlock':
      return <InfoImage block={block} />;
    case 'socialEngagementCardContainer':
      return <SocialCards block={block} />;
    case 'findEskortBlock':
      return <FindEskort block={block} />;
    default:
      return null;
  }
}

export default function CmsHomePage({
  page,
  collectionPages,
  productPages,
  recipeDetails,
}: CmsHomePageProps) {
  if (!page) {
    return (
      <main className="cms-home">
        <div className="cms-home__empty">
          <p>Homepage content is not available.</p>
        </div>
      </main>
    );
  }

  const blocks = page.properties.content?.items ?? [];
  if (!blocks.length) {
    return (
      <main className="cms-home">
        <div className="cms-home__empty">
          <p>No homepage content is currently published.</p>
        </div>
      </main>
    );
  }

  const maps = { collectionPages, productPages, recipeDetails };
  return (
    <main className="cms-home">
      {blocks.map(({ content }) => (
        <div key={content.id}>{renderBlock(content, maps)}</div>
      ))}
    </main>
  );
}
