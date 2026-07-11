export const getReviewTopicRowClassName = ({
  isActive,
  isHighlighted,
}: {
  isActive: boolean;
  isHighlighted: boolean;
}) => [
  'group transition-all duration-300',
  isActive ? 'bg-primary/5' : 'hover:bg-accent/30',
  isHighlighted ? 'highlight-blink z-10' : '',
  'min-w-0',
].filter(Boolean).join(' ');
