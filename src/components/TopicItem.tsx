import React, { useMemo } from 'react';

const TopicItem = ({ topic, onMarkForReview, onCancelReview }) => {
  const isMarkedForReview = useMemo(() => {
    return topic.reviewStage !== undefined && topic.reviewStage !== null;
  }, [topic.reviewStage]);

  const handleMarkForReview = async () => {
    if (isMarkedForReview) {
      await onCancelReview(topic.id);
    } else {
      await onMarkForReview(topic.id);
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default TopicItem; 