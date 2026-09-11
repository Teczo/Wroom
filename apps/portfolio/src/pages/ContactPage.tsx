import type { SiteContentBody } from '@wroom/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Mark, findMark } from '../components/Mark';
import { ClassicForm } from '../features/contact/ClassicForm';
import { ConversationForm } from '../features/contact/ConversationForm';
import { useEnquiryDraft } from '../features/contact/enquiryDraft';
import { FormSwitch } from '../features/contact/formParts';
import { ContentPage } from '../features/content/ContentPage';
import { readContactData, type ContactData } from '../features/content/pageData';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * The contact page, and the only place the portfolio writes anything.
 *
 * The copy — headline, intro, address and the social row — is the published
 * `contact` record. The form below it is not content: it posts to
 * `/public/enquiries`, which is a different path with its own middleware chain
 * (§8), and it does not read `data.email` to do it.
 *
 * There are two forms and one enquiry. The guided flow asks a question at a
 * time; the plain form is the same questions in a column. They share a single
 * draft, so a visitor who swaps halfway keeps everything they have typed, and
 * the switch at the foot of each goes both ways — a one-way door here would
 * strand somebody who opened the wrong one.
 */

/**
 * The address and the social row.
 *
 * Each link draws its mark from `data.marks`, resolved from the library by the
 * publish action. The label stays beside it rather than being replaced by it:
 * this is a list of ways to reach somebody, and a row of bare glyphs makes the
 * reader work out which is which. A key that resolved to nothing simply has no
 * glyph in front of its name.
 */
function ContactChannels({ data }: { data: ContactData }) {
  const socials = data.socials.filter((social) => social.mediaKey !== '' && social.url !== '');

  if (data.email === '' && socials.length === 0) return null;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {data.email ? (
        <a
          href={`mailto:${data.email}`}
          className="font-heading text-base font-medium text-accent underline underline-offset-4 transition-colors hover:text-accent-hover"
        >
          {data.email}
        </a>
      ) : null}

      {socials.length > 0 ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {socials.map((social) => {
            const mark = findMark(data.marks, social.mediaKey);

            return (
              <li key={social.mediaKey}>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 font-heading text-sm font-medium capitalize text-muted transition-colors hover:text-accent"
                >
                  {mark ? <Mark mark={mark} className="size-4" /> : null}
                  {mark?.label || social.mediaKey}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ContactForms({ relatedProjectId }: { relatedProjectId: string }) {
  const draft = useEnquiryDraft(relatedProjectId);
  const [guided, setGuided] = useState(true);

  return (
    <>
      {guided ? <ConversationForm draft={draft} /> : <ClassicForm draft={draft} />}

      {/*
        * Hidden once the enquiry has landed. Offering to change form after the
        * thank-you would suggest there is something left to do, and there is not.
        */}
      {draft.submit.isSuccess ? null : (
        <FormSwitch
          label={guided ? 'Prefer the classic form?' : 'Switch back to the guided form'}
          onClick={() => setGuided((current) => !current)}
        />
      )}
    </>
  );
}

function Contact({ content }: { content: SiteContentBody }) {
  const [params] = useSearchParams();
  const data = readContactData(content.data);

  // `title` is the record's own name and stands in when the page has no
  // headline yet, so the page is never without an `h1`.
  const headline = data?.headline || content.title;

  useDocumentMeta(content.meta.title || headline, content.meta.description);

  // A project id only ever arrives from a case study link. It is a hint about
  // where the enquiry came from — the server stores it only if it names a
  // project that is currently published, and null otherwise.
  const relatedProjectId = params.get('project') ?? '';

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
      <header>
        {headline ? (
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{headline}</h1>
        ) : null}

        {/*
          * Plain text, not markdown. `intro` is a single authored line in the
          * record's `data`, and the field the schema gives it is a string.
          */}
        {data?.intro ? <p className="mt-3 text-base text-muted">{data.intro}</p> : null}

        {data ? <ContactChannels data={data} /> : null}
      </header>

      <ContactForms relatedProjectId={relatedProjectId} />
    </div>
  );
}

export function ContactPage() {
  return (
    <ContentPage contentKey="contact">{(content) => <Contact content={content} />}</ContentPage>
  );
}
