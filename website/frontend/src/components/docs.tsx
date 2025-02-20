import {Component, consume} from '@layr/component';
import {stringifyQuery} from '@layr/navigator';
import {Routable} from '@layr/routable';
import React, {Fragment, useCallback} from 'react';
import {jsx, css, useTheme} from '@emotion/react';
import {page, view, useData} from '@layr/react-integration';
import {Select} from '@emotion-starter/react';
import isEqual from 'lodash/isEqual';

import type {createApplicationComponent} from './application';
import docs from '../docs.json';
import {useStyles} from '../styles';
import {Markdown} from '../markdown';
import {useTitle} from '../utilities';

const VERSIONS = [{name: '1', value: 'v1'}];
const LANGUAGES = [
  {name: 'JavaScript', value: 'js'},
  {name: 'TypeScript', value: 'ts'}
];

const BASE_URL = '/docs';

type URLParams = {
  version: string;
  bookSlug: string;
  chapterSlug: string;
  language: string;
};

type Contents = {books: Book[]};

type Book = {title: string; slug: string; chapters: Chapter[]};

type Chapter = {
  title: string;
  slug: string;
  file: string;
  content: string;
  category: string | undefined;
  nextChapter?: Chapter;
};

type Category = {
  name: string | undefined;
  chapters: Chapter[];
};

export class Docs extends Routable(Component) {
  ['constructor']!: typeof Docs;

  @consume() static Application: ReturnType<typeof createApplicationComponent>;

  @page('[/]docs*') static MainPage() {
    const {Application} = this;

    const theme = useTheme();

    const {version, bookSlug, chapterSlug, language} = this.resolveURL();

    if (
      version === undefined ||
      bookSlug === undefined ||
      chapterSlug === undefined ||
      language === undefined
    ) {
      return <Application.NotFoundView />;
    }

    const navigator = this.getNavigator();

    if (
      navigator.getCurrentPath() !== this.generatePath({version, bookSlug, chapterSlug}) ||
      !isEqual(navigator.getCurrentQuery(), this.generateQuery({language}))
    ) {
      navigator.redirect(
        this.generateURL({
          version,
          bookSlug,
          chapterSlug,
          language,
          hash: navigator.getCurrentHash()
        })
      );
      return null;
    }

    return (
      <div
        css={theme.responsive({
          flexBasis: 960,
          display: 'flex',
          flexWrap: ['nowrap', , 'wrap-reverse']
        })}
      >
        <div css={theme.responsive({width: ['250px', , '100%'], paddingRight: [20, , 0]})}>
          <this.ContentsView
            version={version}
            bookSlug={bookSlug}
            chapterSlug={chapterSlug}
            language={language}
          />
        </div>

        <hr css={theme.responsive({display: ['none', , 'block'], width: '100%'})} />

        <div css={{flexGrow: 1, flexBasis: 640}}>
          <this.ChapterView
            version={version}
            bookSlug={bookSlug}
            chapterSlug={chapterSlug}
            language={language}
          />
        </div>
      </div>
    );
  }

  @view() static ContentsView({version, bookSlug, chapterSlug, language}: URLParams) {
    const theme = useTheme();
    const styles = useStyles();
    const navigator = this.getNavigator();

    const contents = this.getContents();

    const bookMenuStyle = css({...styles.unstyledList, margin: 0});
    const bookMenuItemStyle = css({marginTop: '1rem'});
    const bookMenuItemTitleStyle = css({
      marginBottom: '-.25rem',
      fontSize: theme.fontSizes.h5,
      fontWeight: theme.fontWeights.semibold,
      color: theme.colors.text.muted
    });

    const categoryMenuStyle = css({...styles.unstyledList, margin: 0});
    const categoryMenuItemStyle = css({marginTop: '.75rem'});
    const categoryMenuItemTitleStyle = css({
      fontSize: theme.fontSizes.small,
      fontWeight: theme.fontWeights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 1
    });

    const chapterMenuStyle = css({...styles.unstyledList, margin: 0, marginTop: '.2rem'});
    const chapterMenuItemStyle = css({
      marginTop: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      color: theme.colors.primary.normal // Fixes the color of the ellipsis
    });

    return (
      <nav>
        <div css={{marginBottom: 20}}>
          <this.OptionsView
            version={version}
            bookSlug={bookSlug}
            chapterSlug={chapterSlug}
            language={language}
          />
        </div>

        <ul css={bookMenuStyle}>
          {contents.books.map((book) => {
            const categories = getBookCategories(book);

            return (
              <li key={book.slug} css={bookMenuItemStyle}>
                <div css={bookMenuItemTitleStyle}>{book.title}</div>
                <ul css={categoryMenuStyle}>
                  {categories.map((category) => {
                    return (
                      <li key={category.name || 'uncategorized'} css={categoryMenuItemStyle}>
                        {category.name && (
                          <div css={categoryMenuItemTitleStyle}>{category.name}</div>
                        )}
                        <ul css={chapterMenuStyle}>
                          {category.chapters.map((chapter) => {
                            return (
                              <li key={chapter.slug} css={chapterMenuItemStyle}>
                                <navigator.Link
                                  to={this.generateURL({
                                    version,
                                    bookSlug: book.slug,
                                    chapterSlug: chapter.slug,
                                    language
                                  })}
                                  activeStyle={{color: theme.colors.primary.highlighted}}
                                >
                                  {chapter.title}
                                </navigator.Link>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  @view() static OptionsView({version, bookSlug, chapterSlug, language}: URLParams) {
    const theme = useTheme();
    const navigator = this.getNavigator();

    const hash = navigator.getCurrentHash();

    const changeLanguage = useCallback(
      (event: React.ChangeEvent<HTMLSelectElement>) => {
        const language = event.target.value;
        window.localStorage.setItem('language', language);
        navigator.redirect(this.generateURL({version, bookSlug, chapterSlug, language, hash}));
      },
      [version, bookSlug, chapterSlug, hash]
    );

    const labelStyle = css({
      marginBottom: 3,
      color: theme.colors.text.muted,
      fontSize: theme.fontSizes.small
    });

    return (
      <div css={{display: 'flex'}}>
        <div css={{display: 'flex', flexDirection: 'column', marginRight: 15}}>
          <label htmlFor="version-selector" css={labelStyle}>
            Version
          </label>
          <Select id="version-selector" size="small">
            {VERSIONS.map(({name, value}) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div css={{display: 'flex', flexDirection: 'column'}}>
          <label htmlFor="version-selector" css={labelStyle}>
            Language
          </label>
          <Select id="version-selector" value={language} onChange={changeLanguage} size="small">
            {LANGUAGES.map(({name, value}) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </Select>
        </div>
      </div>
    );
  }

  @view() static ChapterView({version, bookSlug, chapterSlug, language}: URLParams) {
    return useData(
      async () => await this.getChapter({bookSlug, chapterSlug}),

      (chapter) => {
        const theme = useTheme();
        const navigator = this.getNavigator();

        useTitle(chapter.title);

        const {nextChapter} = chapter;

        return (
          <>
            <Markdown languageFilter={language}>{chapter.content}</Markdown>

            {nextChapter && (
              <div css={{marginBottom: 15}}>
                <hr />
                <div>
                  <span style={{color: theme.colors.text.muted}}>Next:</span>{' '}
                  <navigator.Link
                    to={this.generateURL({
                      version,
                      bookSlug,
                      chapterSlug: nextChapter.slug,
                      language
                    })}
                  >
                    {nextChapter.title} →
                  </navigator.Link>
                </div>
              </div>
            )}
          </>
        );
      },

      [bookSlug, chapterSlug], // getter deps

      [language] // renderer deps
    );
  }

  static _contents: Contents;

  static getContents() {
    if (this._contents === undefined) {
      const contents: Contents = (docs as any).versions.v1;

      for (const book of contents.books) {
        let previousChapter: Chapter | undefined;

        for (const chapter of book.chapters) {
          if (previousChapter !== undefined) {
            previousChapter.nextChapter = chapter;
          }

          previousChapter = chapter;
        }
      }

      this._contents = contents;
    }

    return this._contents;
  }

  static async getChapter({bookSlug, chapterSlug}: {bookSlug: string; chapterSlug: string}) {
    const contents = this.getContents();

    const book = contents.books.find((book) => book.slug === bookSlug);

    if (book === undefined) {
      throw new Error(`Book not found (path: '${bookSlug}/${chapterSlug}')`);
    }

    const chapter = book.chapters.find((chapter) => chapter.slug === chapterSlug);

    if (chapter === undefined) {
      throw new Error(`Chapter not found (path: '${bookSlug}/${chapterSlug}')`);
    }

    if (chapter.content === undefined) {
      try {
        const response = await fetch(`${BASE_URL}/v1/${chapter.file}`);
        const content = await response.text();

        if (response.status !== 200) {
          throw new Error('An error occurred while fetching the chapter content');
        }

        chapter.content = content;
      } catch (error) {
        error.displayMessage =
          'Sorry, something went wrong while loading the documentation chapter.';
        throw error;
      }
    }

    return chapter;
  }

  static resolveURL() {
    const navigator = this.getNavigator();

    const path = navigator.getCurrentPath();
    const query = navigator.getCurrentQuery();

    const {version, bookSlug, chapterSlug} = this.resolvePath(path);
    const {language} = this.resolveQuery(query);

    return {version, bookSlug, chapterSlug, language};
  }

  static resolvePath(path: string) {
    const contents = this.getContents();

    const result: {version?: string; bookSlug?: string; chapterSlug?: string} = {};

    let [version, bookSlug, chapterSlug, ...otherSegments] = path.slice('/docs/'.length).split('/');

    if (otherSegments.length > 0) {
      return result;
    }

    result.version = this.resolveVersion(version);

    if (result.version === undefined) {
      return result;
    }

    if (bookSlug === undefined || bookSlug === '') {
      bookSlug = contents.books[0].slug;
    }

    const book = contents.books.find((book) => book.slug === bookSlug);

    if (book === undefined) {
      return result;
    }

    result.bookSlug = book.slug;

    if (chapterSlug === undefined || chapterSlug === '') {
      chapterSlug = book.chapters[0].slug;
    }

    const chapter = book.chapters.find((chapter) => chapter.slug === chapterSlug);

    if (chapter === undefined) {
      return result;
    }

    result.chapterSlug = chapter.slug;

    return result;
  }

  static resolveVersion(version: string | undefined) {
    if (version === undefined || version === '') {
      version = VERSIONS[0].value;
    }

    if (VERSIONS.find(({value}) => value === version) === undefined) {
      return undefined;
    }

    return version;
  }

  static resolveQuery(query: {language?: string}) {
    const language = this.resolveLanguage(query.language);

    return {language};
  }

  static resolveLanguage(language: string | undefined) {
    if (language === undefined) {
      language = window.localStorage.getItem('language') || LANGUAGES[0].value;
    }

    if (LANGUAGES.find(({value}) => value === language) === undefined) {
      return undefined;
    }

    return language;
  }

  static generateURL({
    version,
    bookSlug,
    chapterSlug,
    language,
    hash
  }: URLParams & {
    hash?: string;
  }) {
    let url = this.generatePath({version, bookSlug, chapterSlug});

    const queryString = stringifyQuery(this.generateQuery({language}));

    if (queryString !== '') {
      url += `?${queryString}`;
    }

    if (hash !== undefined) {
      url += `#${hash}`;
    }

    return url;
  }

  static generatePath({
    version,
    bookSlug,
    chapterSlug
  }: {
    version: string;
    bookSlug: string;
    chapterSlug: string;
  }) {
    return `/docs/${version}/${bookSlug}/${chapterSlug}`;
  }

  static generateQuery({language}: {language: string}) {
    return {language};
  }
}

function getBookCategories(book: Book) {
  const categories: Category[] = [];

  for (const chapter of book.chapters) {
    if (categories.length === 0 || categories[categories.length - 1].name !== chapter.category) {
      categories.push({name: chapter.category, chapters: []});
    }

    categories[categories.length - 1].chapters.push(chapter);
  }

  return categories;
}
