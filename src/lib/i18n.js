// i18n – English & Hebrew translation strings
// Usage: const { t } = useLanguage(); t('key')

export const translations = {
  en: {
    // Navbar / Settings
    settings: 'Settings',
    theme: 'Theme',
    themeDark: 'Dark Mode',
    themeLight: 'Light Mode',
    language: 'Language',
    langEn: 'English',
    langHe: 'עברית',
    myProfile: 'My Profile',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    appVersion: 'Version',

    // Feed
    feed: 'Feed',
    endOfFeed: 'End of Feed',
    noDecisionsYet: 'No decisions yet',
    beFirst: 'Be the first to post a decision!',
    beFirstCategory: 'No posts in {cat} yet. Be the first!',
    signInToVote: 'Sign in to vote',
    votesTotal: '{n} votes total',

    // Create Post
    newDecision: 'New Decision',
    yourQuestion: 'Your Question',
    questionPlaceholder: 'e.g. Which outfit should I wear to the party?',
    category: 'Category',
    optionLabel: 'Option {letter}',
    addOption: '+ Add Option',
    removeOption: 'Remove Option',
    postDecision: 'Post Decision',
    uploading: 'Uploading...',
    processingImages: 'Processing images...',
    uploadingImage: 'Uploading image {n}...',
    savingPost: 'Saving post...',
    tipText: 'Post 2–4 options and let the world vote. The more specific your question, the better!',

    // Image Upload
    clickToUpload: 'Click to upload',
    orTakePhoto: 'or take photo',
    dropHere: 'Drop it here!',
    maxSize: 'Max 10MB',

    // Profile
    myDecisions: 'My Decisions',
    posts: 'Posts',
    votes: 'Votes',
    followers: 'Followers',
    following: 'Following',
    editUsername: 'Edit username',
    save: 'Save',
    cancel: 'Cancel',
    noDecisionsProfile: 'No decisions yet',
    createFirstPost: 'Create First Post',
    shareDecisionText: 'Share your first A/B decision with the world!',

    // Comments
    noComments: 'No comments yet. Be first! 🎉',
    addComment: 'Add a comment…',
    signInToComment: 'Sign in to comment',

    // Auth
    welcome: 'Welcome back',
    createAccount: 'Create account',
    email: 'Email',
    password: 'Password',
    username: 'Username',
    continueWithGoogle: 'Continue with Google',
    orContinueWith: 'or continue with',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",

    // Notifications
    notifications: 'Notifications',
    markAllRead: 'Mark all read',
    noNotifications: 'No notifications yet',
    noNotificationsDesc: "They'll appear here when people vote or comment",
    votedOnDecision: 'voted on your decision',
    commentedOnDecision: 'commented on your decision',
    startedFollowing: 'started following you',
    likedYourPost: 'liked your decision',

    // General
    back: 'Back',
    loading: 'Loading',
    error: 'Error',
    retry: 'Retry',
    userNotFound: 'User not found',
    backToFeed: 'Back to Feed',
    decisions: 'decisions',
  },

  he: {
    // Navbar / Settings
    settings: 'הגדרות',
    theme: 'ערכת נושא',
    themeDark: 'מצב כהה',
    themeLight: 'מצב בהיר',
    language: 'שפה',
    langEn: 'English',
    langHe: 'עברית',
    myProfile: 'הפרופיל שלי',
    signOut: 'התנתקות',
    signIn: 'כניסה',
    appVersion: 'גרסה',

    // Feed
    feed: 'פיד',
    endOfFeed: 'סוף הפיד',
    noDecisionsYet: 'אין החלטות עדיין',
    beFirst: 'היה הראשון לפרסם החלטה!',
    beFirstCategory: 'אין פוסטים ב-{cat} עדיין. היה הראשון!',
    signInToVote: 'התחבר כדי להצביע',
    votesTotal: '{n} הצבעות סה"כ',

    // Create Post
    newDecision: 'החלטה חדשה',
    yourQuestion: 'השאלה שלך',
    questionPlaceholder: 'לדוגמה: איזה תלבושת אלבש למסיבה?',
    category: 'קטגוריה',
    optionLabel: 'אפשרות {letter}',
    addOption: '+ הוסף אפשרות',
    removeOption: 'הסר אפשרות',
    postDecision: 'פרסם החלטה',
    uploading: 'מעלה...',
    processingImages: 'מעבד תמונות...',
    uploadingImage: 'מעלה תמונה {n}...',
    savingPost: 'שומר פוסט...',
    tipText: 'פרסם 2–4 אפשרויות ותן לעולם להכריע. ככל שהשאלה ספציפית יותר, כך התוצאות טובות יותר!',

    // Image Upload
    clickToUpload: 'לחץ להעלאה',
    orTakePhoto: 'או צלם תמונה',
    dropHere: 'שחרר כאן!',
    maxSize: 'עד 10MB',

    // Profile
    myDecisions: 'ההחלטות שלי',
    posts: 'פוסטים',
    votes: 'הצבעות',
    followers: 'עוקבים',
    following: 'עוקב אחרי',
    editUsername: 'ערוך שם משתמש',
    save: 'שמור',
    cancel: 'ביטול',
    noDecisionsProfile: 'אין החלטות עדיין',
    createFirstPost: 'צור פוסט ראשון',
    shareDecisionText: 'שתף את ההחלטה הראשונה שלך עם העולם!',

    // Comments
    noComments: 'אין תגובות עדיין. היה הראשון! 🎉',
    addComment: 'הוסף תגובה...',
    signInToComment: 'התחבר כדי להגיב',

    // Auth
    welcome: 'ברוך שובך',
    createAccount: 'יצירת חשבון',
    email: 'אימייל',
    password: 'סיסמה',
    username: 'שם משתמש',
    continueWithGoogle: 'המשך עם Google',
    orContinueWith: 'או המשך עם',
    alreadyHaveAccount: 'כבר יש לך חשבון?',
    dontHaveAccount: 'אין לך חשבון?',

    // Notifications
    notifications: 'התראות',
    markAllRead: 'סמן הכל כנקרא',
    noNotifications: 'אין התראות עדיין',
    noNotificationsDesc: 'יופיעו כאן כשיצביעו או יגיבו אצלך',
    votedOnDecision: 'הצביע על ההחלטה שלך',
    commentedOnDecision: 'הגיב על ההחלטה שלך',
    startedFollowing: 'התחיל לעקוב אחריך',
    likedYourPost: 'אהב את ההחלטה שלך',

    // General
    back: 'חזרה',
    loading: 'טוען',
    error: 'שגיאה',
    retry: 'נסה שוב',
    userNotFound: 'משתמש לא נמצא',
    backToFeed: 'חזרה לפיד',
    decisions: 'החלטות',
  },
}

/** Simple interpolation: t('hello {name}', { name: 'World' }) → 'hello World' */
export function interpolate(str, vars = {}) {
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}
