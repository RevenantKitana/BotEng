/**
 * Keyword matching logic for the study buddy chatbot
 * Based on family-related keywords matrix
 */

const KEYWORD_GROUPS = {
  mother: {
    keywords: ['mom', 'mother', 'mum', "mom's", "mother's"],
    response: 'That\'s wonderful! Can you tell me more about what your mother does to make you feel supported?'
  },
  father: {
    keywords: ['dad', 'father', 'pop', "dad's", "father's"],
    response: 'That\'s great! What does your father do or say that makes you feel supported?'
  },
  sibling: {
    keywords: ['brother', 'sister', 'sibling', 'siblings', 'bro', 'sis', 'brother\'s', 'sister\'s'],
    response: 'How wonderful! Can you give me an example of how your sibling helps or supports you?'
  },
  grandparent: {
    keywords: ['grandma', 'grandpa', 'grandmother', 'grandfather', 'grandparent', 'grandparents', 'granny', 'grandmum'],
    response: 'That\'s special! How do your grandparents show you their support?'
  },
  auntUncle: {
    keywords: ['aunt', 'uncle', 'auntie'],
    response: 'How interesting! Can you tell me what your aunt or uncle does to support you?'
  },
  cousin: {
    keywords: ['cousin', 'cousins'],
    response: 'That\'s nice! What do your cousins do that makes you feel supported?'
  },
  family: {
    keywords: ['family', 'everyone', 'both parents', 'all', 'whole family'],
    response: 'I see! Can you give me one specific example of how someone in your family supports you?'
  },
  friend: {
    keywords: ['friend', 'friends', 'buddy', 'mate', 'pal', 'classmate'],
    response: 'That\'s nice, but let\'s focus on your family - who in your family do you think supports you most?'
  },
  pet: {
    keywords: ['dog', 'cat', 'pet', 'puppy', 'kitten', 'animals', 'animal'],
    response: 'Aww, that\'s sweet! 🐾 Now, how does your family support you? Who in your family helps you the most?'
  },
  noSupport: {
    keywords: ['no one', 'nobody', 'no support', 'no one supports', 'nobody supports'],
    response: "Time's up! Thanks for sharing. 🎉",
    shouldEnd: true
  }
};

/**
 * Get bot response based on user input keywords
 * @param {string} userInput - User's message in lowercase
 * @returns {object} - { response: string, shouldEnd: boolean }
 */
function getKeywordResponse(userInput) {
  // Trim and clean input
  const cleanInput = userInput.trim();

  // Check each keyword group (priority order: family-specific > pet > friend > no support > default)
  const priorityGroups = [
    'mother', 'father', 'sibling', 'grandparent', 'auntUncle', 'cousin',
    'family', 'noSupport', 'pet', 'friend'
  ];

  for (const groupName of priorityGroups) {
    const group = KEYWORD_GROUPS[groupName];
    for (const keyword of group.keywords) {
      if (cleanInput.includes(keyword)) {
        return {
          response: group.response,
          shouldEnd: group.shouldEnd || false,
          matchedGroup: groupName
        };
      }
    }
  }

  // Default response if no keywords match
  return {
    response: 'That\'s interesting — can you tell me a bit more?',
    shouldEnd: false,
    matchedGroup: 'default'
  };
}

module.exports = {
  getKeywordResponse,
  KEYWORD_GROUPS
};
