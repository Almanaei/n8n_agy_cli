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

def diacritize_arabic(text: str) -> str:
    """
    Substitutes common civil defense phrases and words with their diacritized versions.
    Acts as a lightweight rule-based speech shaping pre-processor.
    Ensures only full words (with optional common Arabic prefixes) are matched to prevent
    corrupting letters within larger unrelated words.
    """
    if not text:
        return ""
    
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
