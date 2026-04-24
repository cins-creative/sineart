interface PullquoteProps {
  quote: string;
  author?: string;
}

export function Pullquote({ quote, author }: PullquoteProps) {
  return (
    <blockquote className="pullquote">
      <p className="pq-text">{quote}</p>
      {author && <cite className="pq-author">{author}</cite>}
    </blockquote>
  );
}
