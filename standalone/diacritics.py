import re

# Dictionary of common civil defense and greeting terms mapped to their fully diacritized Arabic versions.
# This ensures correct pronunciation on standard TTS engines.
DIACRITICS_DICTIONARY = {
    "الدفاع المدني": "الدِّفاعُ المَدَنِيُّ",
    "البحرين": "البَحْرَيْن",
    "مملكة البحرين": "مَمْلَكَةُ البَحْرَيْن",
    "مرحبا": "مَرْحَبًا",
    "أهلا": "أَهْلًا",
    "الاسم": "الاِسْمُ",
    "الهاتف": "الهَاتِفُ",
    "رقم الهاتف": "رَقْمُ الهَاتِفِ",
    "البريد الإلكتروني": "البَرِيدُ الإِلِكْتُرُونِيُّ",
    "إيميل": "إِيمِيل",
    "المستندات": "المُسْتَنَدَاتِ",
    "الرخصة": "الرُّخْصَةِ",
    "الغاز": "الغَازِ",
    "رسوم": "رُسُومُ",
    "دينار": "دِينَار",
    "بحريني": "بَحْرَيْنِيّ",
    "عشرون": "عِشْرُونَ",
    "المكالمة": "المُكَالَمَةِ",
    "المحادثة": "المُحَادَثَةِ",
    "شكرا": "شُكْرًا",
    "مع السلامة": "مَعَ السَّلَامَةِ",
    "وعليكم السلام": "وَعَلَيْكُمُ السَّلَامُ",
}

KNOWN_WORDS = {
    'gmail', 'yahoo', 'outlook', 'hotmail', 'com', 'net', 'org', 'edu', 'gov', 'bh'
}

def compress_spaced_english(text: str) -> str:
    if not text:
        return ""
    # Split text into words and spaces
    tokens = re.split(r'(\s+)', text)
    merged_tokens = []
    for token in tokens:
        if not token:
            continue
        if not merged_tokens:
            merged_tokens.append(token)
            continue
        # If the token is whitespace
        if token.isspace():
            merged_tokens.append(token)
            continue
        # Get the previous word
        if len(merged_tokens) >= 2 and merged_tokens[-1].isspace() and len(merged_tokens[-1]) == 1:
            prev_word = merged_tokens[-2]
            # Check if both are English/symbol words
            is_eng_prev = re.match(r'^[a-zA-Z0-9@\._\-]+$', prev_word)
            is_eng_curr = re.match(r'^[a-zA-Z0-9@\._\-]+$', token)
            if is_eng_prev and is_eng_curr:
                # Merge if at least one of them has length 1
                if len(prev_word) == 1 or len(token) == 1:
                    merged_tokens.pop()  # Remove space
                    merged_tokens[-1] = prev_word + token
                    continue
        merged_tokens.append(token)
    return "".join(merged_tokens)

def spell_english_word_or_letters(word: str) -> str:
    word_clean = word.strip().lower()
    if not word_clean:
        return ""
    if word_clean in KNOWN_WORDS:
        return word_clean
    if len(word_clean) == 1:
        return word_clean
    # Spell out letters and digits separated by spaces
    spelled = []
    for char in word:
        if char.isalnum():
            spelled.append(char)
    return " ".join(spelled)

def spell_english_text_for_tts(text: str) -> str:
    """
    Formats English letters, symbols, and words (like emails) to be spelled and
    pronounced in English by padding individual letters and using English terms (at, dot).
    """
    if not text:
        return ""
    # 1. Compress spaced-out English characters (e.g. j o h n -> john)
    text = compress_spaced_english(text)
    # 2. Find all sequences of English letters, numbers, and common email punctuation
    pattern = re.compile(r'[a-zA-Z0-9@\._\-]+')
    
    def replace_match(match):
        match_str = match.group(0)
        # Standalone symbols
        if match_str == '.':
            return ' dot '
        if match_str == '@':
            return ' at '
        if match_str == '-':
            return ' '
        if match_str == '_':
            return ' '
            
        # If it contains @, it is an email address
        if '@' in match_str:
            parts = match_str.split('@', 1)
            username = parts[0]
            domain_part = parts[1] if len(parts) > 1 else ""
            
            user_subparts = username.split('.')
            spelled_user_parts = []
            for sub in user_subparts:
                if sub:
                    spelled_user_parts.append(spell_english_word_or_letters(sub))
            spelled_username = " dot ".join(spelled_user_parts)
            
            domain_subparts = domain_part.split('.')
            spelled_domain_parts = []
            for sub in domain_subparts:
                if sub:
                    spelled_domain_parts.append(spell_english_word_or_letters(sub))
            spelled_domain = " dot ".join(spelled_domain_parts)
            
            return f" {spelled_username} at {spelled_domain} "
        else:
            # English word, code, or letters
            subparts = re.split(r'[\._\-]', match_str)
            spelled_subparts = []
            for sub in subparts:
                if sub:
                    spelled_subparts.append(spell_english_word_or_letters(sub))
            if '.' in match_str:
                return f" {' dot '.join(spelled_subparts)} "
            else:
                return f" {' '.join(spelled_subparts)} "
                
    processed = pattern.sub(replace_match, text)
    # Standalone cleanup
    processed = processed.replace("@", " at ")
    processed = processed.replace(".", " dot ")
    processed = re.sub(r'\s+', ' ', processed).strip()
    return processed

def diacritize_arabic(text: str) -> str:
    """
    Substitutes common civil defense phrases and words with their diacritized versions.
    Acts as a lightweight rule-based speech shaping pre-processor.
    Ensures only full words (with optional common Arabic prefixes) are matched to prevent
    corrupting letters within larger unrelated words.
    """
    if not text:
        return ""
    
    # Phonetically shape English characters for Arabic TTS
    text = spell_english_text_for_tts(text)
    
    processed = text
    for phrase, diacritized in DIACRITICS_DICTIONARY.items():
        # Match only full words with common Arabic prefixes:
        # - Prefix group matches: و, ب, ف, ل, ك (possibly followed by ال), or ال, or لل, or ولل, or بلل
        # - Lookbehind (?<![\u0600-\u06FF]) and lookahead (?![\u0600-\u06FF]) ensure no overlapping Arabic letters
        pattern = re.compile(
            r'(?<![\u0600-\u06FF])'
            r'((?:[وبفلك](?:ال)?|ال|لل|ولل|بلل)?)'
            r'(?:' + re.escape(phrase) + r')'
            r'(?![\u0600-\u06FF])',
            re.IGNORECASE
        )
        processed = pattern.sub(r'\1' + diacritized, processed)
        
    return processed

if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    test_text = "مرحبا بك في مركز خدمات الدفاع المدني في مملكة البحرين. يرجى تزويدي بالاسم ورقم الهاتف."
    print("Original:", test_text)
    print("Diacritized:", diacritize_arabic(test_text))
