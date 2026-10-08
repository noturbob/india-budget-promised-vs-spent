"""Flagship schemes: every budget line belonging to a scheme, combined across funding sources.

A scheme is often printed as several lines: a transfer into a dedicated fund, the spending, and an
"amount met from" the fund (negative); or one line per funding source (gross budgetary support,
a cess fund, a road fund). Matching all of them by name pattern within the ministry and summing
gives what the scheme itself received. The patterns are deliberately explicit so they can be audited.
"""
import re

# name -> (ministry substring, label regex)
FLAGSHIPS = {
    "MGNREGA (rural jobs guarantee)": ("RURAL DEVELOPMENT", r"employment g(?:ua|au)rantee|mgnrega"),
    "PM-Kisan (cash to farmers)": ("AGRICULTURE", r"kisan samman"),
    "PM Awas Yojana – Gramin (rural housing)": ("RURAL DEVELOPMENT", r"awas yojana|pmay|rural housing|indira awas"),
    "PM Awas Yojana – Urban": ("HOUSING AND URBAN", r"pmay|awas yojana|housing for all"),
    "Jal Jeevan Mission (tap water)": ("JAL SHAKTI", r"jal jeevan|rural drinking water"),
    "Swachh Bharat Mission (rural + urban)": ("", r"swachh bharat|\bsbm\b"),
    "Samagra Shiksha (school education)": ("EDUCATION", r"samagra shiksha|sarva shiksha|rashtriya madhyamik"),
    "PM POSHAN (school meals)": ("EDUCATION", r"poshan shakti|mid.?day meal|national programme of mid"),
    "Ayushman Bharat – PMJAY (health insurance)": ("HEALTH", r"jan arogya|pmjay|rashtriya swasthya bima"),
    "Anganwadi & Poshan 2.0 (child nutrition)": ("WOMEN AND CHILD", r"anganwadi|poshan 2|integrated child development|\bicds\b|umbrella icds"),
    "PM Gram Sadak Yojana (rural roads)": ("RURAL DEVELOPMENT", r"gram sadak"),
    "PM Fasal Bima Yojana (crop insurance)": ("AGRICULTURE", r"fasal bima|crop insurance"),
    "Smart Cities Mission": ("HOUSING AND URBAN", r"smart cit"),
    "AMRUT (urban water & sewerage)": ("HOUSING AND URBAN", r"\bamrut\b|atal mission for rejuvenation"),
    "Namami Gange (clean Ganga)": ("JAL SHAKTI", r"namami gange|clean ganga|ganga plan"),
    "Skill India (PMKVY)": ("SKILL DEVELOPMENT", r"kaushal vikas|pmkvy|skill india"),
    "Scholarships for SC students": ("SOCIAL JUSTICE", r"(pre|post).?matric scholarships? for scs?\b"),
    "Scholarships for minority students": ("MINORITY AFFAIRS", r"education empowerment|scholarship"),
    "Food subsidy": ("FOOD AND PUBLIC DISTRIBUTION", r"food subsidy"),
    "Fertiliser subsidy": ("FERTILISERS", r"urea subsidy|nutrient based subsidy"),
    "PLI & semiconductor incentives (electronics)": ("ELECTRONICS AND INFORMATION", r"production linked incentive|\bpli\b|semicon|semiconductor|display fab"),
}


# Lines with no scheme name of their own; they belong to the heading they are printed under
# (older budgets print MGNREGA as a heading with a bare "Programme Component" line).
GENERIC = re.compile(r"^(programme component|amount met|transfer to|less\b)", re.I)


def flagship_of(ministry: str, scheme: str, section: str = "") -> str | None:
    for name, (min_part, pattern) in FLAGSHIPS.items():
        if min_part not in ministry:
            continue
        if re.search(pattern, scheme, re.I) or (GENERIC.match(scheme) and re.search(pattern, section, re.I)):
            return name
    return None
