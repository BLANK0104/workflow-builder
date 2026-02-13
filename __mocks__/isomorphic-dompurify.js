const DOMPurify = {
  sanitize: jest.fn((input, config) => {
    // Comprehensive mock implementation for DOMPurify
    if (typeof input !== 'string') return '';
    
    // If STRIP_TAGS is true, strip all tags and script content
    if (config && config.STRIP_TAGS) {
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
        .replace(/<[^>]*>/g, ''); // Remove all other HTML tags
    }
    
    // If ALLOWED_TAGS is empty, strip all tags
    if ((config && config.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0)) {
      return input.replace(/<[^>]*>/g, '').replace(/<script[^>]*>.*?<\/script>/gi, '');
    }
    
    // If specific tags are allowed, keep only those
    if (config && config.ALLOWED_TAGS && config.ALLOWED_TAGS.length > 0) {
      const allowedTags = config.ALLOWED_TAGS.join('|');
      const allowedTagsRegex = new RegExp(`<(?!/?(?:${allowedTags})\\b)[^>]*>`, 'gi');
      return input.replace(allowedTagsRegex, '');
    }
    
    // Default: remove dangerous tags but keep safe ones
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                .replace(/<object[^>]*>.*?<\/object>/gi, '')
                .replace(/<embed[^>]*>/gi, '')
                .replace(/<link[^>]*>/gi, '')
                .replace(/<style[^>]*>.*?<\/style>/gi, '');
  }),
};

module.exports = DOMPurify;