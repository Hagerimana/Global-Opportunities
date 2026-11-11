/**
 * Landing-page catalogue additions -- Kiswahili (sw).
 *
 * Muundo ni sawa kabisa na `landing-en.cjs`: funguo, mpangilio wa safu na
 * urefu wa safu haujabadilishwa. Ni thamani za maandishi pekee zilizotafsiriwa.
 * `scripts/apply-i18n.cjs` huunganisha tawi la `landing` kwenye
 * `messages/sw/landing.json`.
 */
module.exports = {
  landing: {
    nav: {
      homeAria: "Global Opportunities, ukurasa wa mwanzo",
      logoutFailed:
        "Kutoka kwa akaunti hakukukamilika. Tafadhali jaribu tena au safisha kipindi cha kivinjari hiki.",
      logoutRecoveryNote:
        "Kusafisha kipindi cha kivinjari hiki huondoa tokeni zake zilizohifadhiwa, lakini hakuthibitishi kwamba tokeni ya kuhuisha ilibatilishwa kwenye seva.",
      retryLogout: "Jaribu kutoka tena",
      clearSession: "Safisha kipindi cha kivinjari hiki",
      dismiss: "Funga",
    },

    hero: {
      description:
        "Global Opportunities huleta fursa za ufadhili, wito wa miradi, maombi, tathmini, utoaji wa fedha na ufuatiliaji wa malipo katika nafasi moja salama yenye lugha nyingi. Mmiliki wa mradi hugundua wito, hujenga mradi kwa vigezo vyake halisi, huwasilisha maombi, na hufuatilia ufadhili hadi utekelezaji — bila kupoteza mwendelezo katika masanduku kadhaa ya barua pepe.",
      stepProgress: "Hatua {step} ya {total}",
      mock: {
        amount: "12k - 60k USD",
        documentsReady: "Nyaraka 3 ziko tayari",
        documentsList: "Usajili · Mpango wa kazi · Bajeti",
        trancheReleased: "Awamu ya 1 imetolewa",
        trancheAmount: "USD 16,000 kati ya 48,000",
        askAi: "Muulize Msaidizi wa AI wito huu unahitaji nini",
      },
    },

    trust: {
      description:
        "Kila takwimu iliyo hapo juu inaelezea jukwaa jinsi linavyojengwa leo. Hakuna iliyo hapa ambayo ni takwimu ya matumizi, kwa sababu bado hakuna data ya matumizi iliyothibitishwa.",
      assurance:
        "Usalama unaelezewa kwa kile ambacho jukwaa hufanya — vipindi vinavyotegemea tokeni, nyaraka zinazohusishwa na mradi, ufikiaji unaotegemea majukumu — na si kwa beji ambazo halijapewa.",
      details: [
        "Katalogi za kiolesura za Kiingereza, Kifaransa, Kirundi na Kiswahili.",
        "Gundua kupitia Monitor — safari kamili kutoka fursa hadi matokeo.",
        "Moduli za kikoa zinazoshughulikia wito, miradi, maombi, ufadhili na nyaraka.",
        "Majukumu ya washiriki ambayo jukwaa limejengwa kuyahusu, kutoka mwombaji hadi msimamizi.",
      ],
      signalDetails: {
        auth: "Vitambulisho hubadilishwa kwa tokeni ya ufikiaji ya muda mfupi, na hakuna kipindi kinachohifadhiwa kwenye ukurasa.",
        docs: "Kila faili inayopakiwa hubeba kategoria na hali ya mapitio, hivyo hali yake inaonekana kwa pande zote mbili.",
        notifications:
          "Tarehe za mwisho, maamuzi na hali za nyaraka huzalisha arifa zenye mapendeleo ya kila mtumiaji.",
        structure:
          "Maombi, maamuzi na malipo ni kumbukumbu zilizopangwa badala ya viambatisho vya barua pepe.",
      },
    },

    discovery: {
      description:
        "Fursa za ufadhili na wito wa miradi ziko katika faharasa moja. Chuja kwa aina, sekta, mahali na hali, kisha fungua tangazo kuona vigezo vya ustahili na nyaraka inazozihitaji.",
    },

    features: {
      description:
        "Ugunduzi ni mahali ambapo mmiliki wa mradi huanzia. Kila kitu baada ya hapo — kujenga mradi, kuwasilisha maombi, kutathminiwa, kufadhiliwa, kulipwa, na kuthibitisha kilichobadilika — hufanyika kwa kumbukumbu hiyo hiyo badala ya mfumo mpya kila mara.",
      details: [
        "Faharasa moja inayotafutika ya fursa za ufadhili na wito, inayochujika kwa aina, sekta, mahali na hali.",
        "Kumbukumbu ya mradi iliyopangwa yenye malengo, matokeo, bajeti na nyaraka, hivyo mradi hujengwa mara moja na kutumika tena.",
        "Maombi hubeba hali na historia, hivyo mwombaji hujua kila wakati hatua ambayo wasilisho lake limefika.",
        "Vigezo vilivyoainishwa, mapitio yaliyopewa na uamuzi uliorekodiwa, hivyo uteuzi unaelezeka badala ya kuwa fumbo.",
        "Ufadhili uliotolewa na kila awamu hufuatiliwa dhidi ya mradi, na awamu inayofuata inaonekana.",
        "Malipo hurekodiwa dhidi ya awamu, yakipa pande zote mtazamo mmoja wa kile kilicholipwa na kile kinachosubiri.",
        "Nyaraka hupakiwa mara moja, hupangwa kwa kategoria, na hushirikiwa na wahusika walioambatishwa kwenye mradi pekee.",
        "Vikumbusho vya tarehe ya mwisho, taarifa za maamuzi na hali za nyaraka hufikishwa kwa watu wanaozihitaji.",
        "Majibu kwa lugha rahisi kuhusu fursa, ustahili wake na nyaraka zake — yakiegemezwa kwenye taarifa rasmi.",
      ],
    },

    showcase: {
      description:
        "Kila skrini hapa chini imechorwa kutoka kwa vipengele vile vile vinavyotumika kwenye ukurasa huu. Kinachobadilika kati yao ni mshiriki: mwombaji anayepitia wito, mmiliki wa mradi anayesimamia utekelezaji, mfadhili anayefuatilia ufadhili.",
      mock: {
        search: "ustahimilivu",
        meta: ["Hufungwa 15 Okt", "Hufungwa 18 Des", "Hufunguliwa 01 Nov"],
        deltas: [
          "+1 mwezi huu",
          "2 zinasubiri mapitio",
          "USD, katika miradi 3",
          "4 zinahitaji uangalizi",
        ],
        activity: [
          "Maombi yamewasilishwa",
          "Nyaraka ya bajeti imebadilishwa",
          "Swali la mtathminiaji limejibiwa",
          "Kikumbusho cha tarehe ya mwisho kimetumwa",
        ],
        when: ["Saa 2 zilizopita", "Jana", "Siku 3 zilizopita", "Siku 5 zilizopita"],
        applicationTitles: [
          "Urejeshaji wa beseni la maji",
          "Vilabu vya shule na vikundi vya kusoma",
          "Vituo vya muunganisho wa mtandao vijijini",
        ],
        funders: [
          "Mtoaji wa ufadhili wa mfano",
          "Sekretarieti ya programu ya mfano",
          "Mfuko wa teknolojia wa mfano",
        ],
        amounts: ["USD 16,000", "USD 16,000", "USD 16,000"],
        totalAwarded: "USD 48,000",
        disbursed: "USD 24,000",
        paymentDates: ["12 Ago 2026", "04 Sep 2026"],
        paymentAmounts: ["USD 16,000", "USD 8,000"],
      },
    },

    how: {
      description:
        "Kila skrini, arifa na ruhusa kwenye jukwaa hulingana na moja ya hatua hizi tisa. Hilo ndilo linalofanya mradi, maombi yake, ufadhili wake na taarifa zake kuelezea kitu kimoja.",
      details: [
        "Tafuta kwenye faharasa ya matangazo yaliyo wazi na chuja hadi yale yanayolingana na sekta, mahali na tarehe ya mwisho.",
        "Soma muhtasari, vigezo vya ustahili, nyaraka zinazohitajika na tarehe ya mwisho kwa kila tangazo lililoteuliwa.",
        "Jenga kumbukumbu ya mradi: malengo, matokeo yanayotarajiwa, bajeti, timu na nyaraka za usaidizi.",
        "Wasilisha mradi dhidi ya tangazo. Maombi hurithi nyaraka za mradi badala ya kuziomba tena.",
        "Tathmini hufanyika kwa vigezo vilivyoainishwa, na kila mapitio hurekodiwa dhidi ya kazi iliyopewa.",
        "Uamuzi wa uteuzi hurekodiwa kwenye maombi na pande zote mbili huarifiwa.",
        "Ufadhili uliotolewa huambatishwa kwenye mradi pamoja na ratiba ya awamu ambayo mwombaji anaweza kuiona.",
        "Malipo hurekodiwa dhidi ya kila awamu, na kuifunga kadri kazi inavyotekelezwa.",
        "Shughuli, viashiria na nyaraka hubaki kuonekana kwenye mradi kwa maisha yake yote, si hadi tarehe ya mwisho pekee.",
      ],
      outputs: [
        "Orodha fupi",
        "Uamuzi wazi wa kuendelea au kutokuendelea",
        "Mradi kamili",
        "Maombi yanayofuatiliwa",
        "Tathmini yenye alama",
        "Matokeo yaliyorekodiwa",
        "Ratiba iliyokubaliwa",
        "Mfuatano wa malipo uliosawazishwa",
        "Ushahidi unaoendelea",
      ],
    },

    benefits: {
      description:
        "Msuguano mwingi katika kuomba ufadhili si uandishi. Ni kupata wito, kufahamu unachohitaji, kuweka nyaraka sawa, na kujua kilichotokea. Haya ni maeneo manane ambapo jukwaa huondoa kazi.",
      details: [
        "Matangazo kutoka kwa kila mtoaji katika faharasa moja, yenye seti moja ya vichujio, badala ya masanduku kadhaa ya barua pepe na tovuti.",
        "Nyaraka huambatishwa kwenye mradi mara moja na husafiri pamoja na maombi, hivyo hakuna kinachopakiwa tena kwa kila wito.",
        "Mradi ni kumbukumbu yenye malengo, matokeo, bajeti na maendeleo, si folda ya faili zenye majina tofauti.",
        "Vigezo, alama na uamuzi vinaonekana, hivyo mwombaji anaweza kuona kwa nini maombi yalipita au hayakupita.",
        "Ufadhili uliotolewa, awamu inayofuata na kile kilicholipwa vinaonekana kwa pande zote kwa wakati mmoja.",
        "Nyaraka hupangwa kwa kategoria, zinapitiwa, na zinahusishwa na mradi badala ya kutawanyika kwenye barua pepe.",
        "Mtumiaji anayefanya kazi kwa Kiswahili husoma jukwaa lile lile kama mtumiaji anayefanya kazi kwa Kifaransa, kwa lugha yake mwenyewe.",
        "Msaidizi anayeeleza wito, anaorodhesha nyaraka unazohitaji na anatafsiri sehemu za kiufundi.",
      ],
    },

    ecosystem: {
      description:
        "Jukwaa ni kumbukumbu ya pamoja. Kila mshiriki huona sehemu anayohusika nayo, na kila mwingiliano kati yao ni hatua kwenye mradi huo huo badala ya ujumbe kwenye mnyororo tofauti.",
      hubLabel: "Kumbukumbu ya pamoja ambayo kila mshiriki anafanyia kazi",
      actorDetails: [
        "Hutekeleza miradi, humiliki kumbukumbu za miradi, na huona maombi na ufadhili wao mahali pamoja.",
        "Huchapisha fursa, huweka vigezo, hugawa tathmini, hutoa ufadhili na hupanga awamu za malipo.",
        "Huratibu mradi kwa timu nzima, kwa kumbukumbu moja ambayo kila mtu anachangia.",
        "Hugundua wito, hujenga mradi dhidi yake, huwasilisha maombi, na hufuatilia matokeo hatua kwa hatua.",
        "Hupitia maombi yaliyopewa kwa vigezo vilivyochapishwa na hurekodi tathmini yenye alama.",
        "Huhakiki taasisi, husimamia majukumu, na husimamia shughuli na kumbukumbu za jukwaa.",
      ],
      flows: [
        "Kuchapisha matangazo",
        "Kujenga mradi",
        "Kuwasilisha maombi",
        "Kutathmini",
        "Kuamua",
        "Kutoa fedha",
      ],
    },

    projects: {
      eyebrow: "Miradi",
      title: "Mawazo yanayotafuta usaidizi. Miradi inayoendelea.",
      description:
        "Chunguza miradi iliyochapishwa, kazi zinazofadhiliwa zinazoendelea, na juhudi zilizokamilika hivi karibuni.",
      ctaNew: "Ongeza mradi wako",
      ctaAll: "Ona miradi yote inayotafuta ufadhili",
      errorFallback: "Imeshindwa kupakia miradi.",
      retry: "Jaribu kupakia miradi tena",
      loading: "Inapakia miradi…",
      fundedTitle: "Miradi iliyofadhiliwa",
      groups: {
        seeking: {
          title: "Inatafuta ufadhili",
          body: "Miradi minne mipya iliyochapishwa bila mgao wa ufadhili ulioidhinishwa.",
          empty: "Kwa sasa hakuna miradi iliyochapishwa inayotafuta ufadhili.",
        },
        inProgress: {
          title: "Inaendelea",
          body: "Hadi miradi minne iliyo kwenye asilimia 90 au chini yake, ilivyopangwa kwa maendeleo kutoka juu hadi chini.",
          empty: "Bado hakuna miradi iliyofadhiliwa inayostahili kuonyeshwa inayoendelea.",
        },
        completed: {
          title: "Iliyokamilika hivi karibuni",
          body: "Miradi minne iliyofadhiliwa iliyokamilika hivi karibuni zaidi.",
          empty: "Bado hakuna miradi iliyofadhiliwa iliyokamilika.",
        },
      },
      items: {
        watershed: {
          title: "Urejeshaji wa beseni la maji katika komuni tatu",
          funding: "USD 48,000 kwa miezi 24",
          objective:
            "Kurejesha miteremko iliyoharibika na kuimarisha vyanzo vya maji katika komuni tatu, vikiongozwa na vyama vya ushirika vya wakulima.",
          results: [
            "Hekta 120 zinaendelea kurejeshwa",
            "Vyama 40 vya ushirika vya wakulima vimehusishwa",
            "Utoaji wa vyanzo vya maji umerejeshwa katika maeneo 6",
          ],
          impact: ["vyanzo vilivyorejeshwa", "vyama vya ushirika", "vyanzo vya maji"],
        },
        schoolClubs: {
          title: "Vilabu vya shule na vikundi vya kusoma vya jamii",
          funding: "USD 31,500 kwa miezi 18",
          objective:
            "Kuanzisha vilabu endelevu vya wanafunzi na vikundi vya kusoma vya watu wazima vinavyoendelea kufanya kazi baada ya kipindi cha mradi.",
          results: [
            "Vilabu 60 vya shule vimeundwa na vinafanya kazi",
            "Vikundi 25 vya kusoma na kuandika vya watu wazima vinakutana kila wiki",
            "Tathmini ya usomaji ngazi ya makundi imefanyika",
          ],
          impact: ["wanafunzi", "vilabu", "wilaya"],
        },
        sharedConnectivity: {
          title: "Vituo vya muunganisho wa mtandao vijijini vinavyotumika kwa pamoja",
          funding: "USD 65,000 kwa miezi 30",
          objective:
            "Kuvipa vituo vya ufikiaji vya jamii vifaa, muunganisho wa mtandao na mafunzo, vikisimamiwa na vyama vya ushirika vya eneo.",
          results: [
            "Vituo 25 vya ufikiaji vimepambwa vifaa na vinafanya kazi",
            "Wakufunzi 60 wa jamii wameidhinishwa",
            "Gharama kwa mtumiaji iko chini ya kiwango cha kitaifa",
          ],
          impact: ["vituo vya ufikiaji", "wakufunzi", "watumiaji"],
        },
      },
    },

    ai: {
      description:
        "Uliza swali kwa lugha yoyote ya kiolesura kati ya nne. Msaidizi hufanya kazi kwa taarifa za jukwaa yenyewe — tangazo, vigezo vyake, nyaraka zake — badala ya kukisia kwa upana.",
      capabilityDetails: [
        "Kufupisha wito unahusu nini, umewaziwa nani, na utafadhili nini.",
        "Kubadilisha sehemu nene ya ustahili kuwa orodha ya ukaguzi unayoweza kujibu.",
        "Kuorodhesha nyaraka ambazo wito unazihitaji na kuonyesha zile ambazo bado haziko kwenye mradi wako.",
        "Kupunguza nyaraka ndefu ya wito hadi aya zinazoathiri taasisi yako.",
        "Kutoa maelezo kwa lugha ambayo msomaji anafanyia kazi.",
        "Kukuongoza hatua inayofuata ya maombi, kwa mpangilio, bila kuruka chochote.",
      ],
      script: {
        assistant: [
          "Naweza kukusaidia kufanya kazi na vigezo rasmi. Kwa ruzuku ya jamii, mambo mawili ambayo kawaida huamua ustahili ni usajili wa kisheria na angalau mwaka mmoja wa shughuli zilizorekodiwa.",
          "Wito mwingi huhitaji vitatu: cheti cha usajili, mpango wa kazi uliosainiwa na bajeti. Fungua tangazo na paneli ya nyaraka itaziorodhesha dhidi ya kile ulichokwisha pakuwa.",
        ],
      },
    },

    languages: {
      description:
        "Kiolesura kinatolewa kwa Kiingereza, Kifaransa, Kirundi na Kiswahili. Msomaji anaweza kutafuta, kuchuja, kuhifadhi na kuwasilisha bila kuondoka kwenye lugha aliyoanzia, na msimamizi anaweza kuongeza lugha ya tano bila kugusa kipengele kimoja.",
      note: "Kiolesura na maudhui ya ukurasa vimetafsiriwa katika lugha zote nne. Kichwa cha tangazo lenyewe hubaki katika lugha iliyoandikwa; kiolesura kinachokizunguka hufuata msomaji.",
    },

    testimonials: {
      quotes: [
        "Nilikuwa nikiweka wito kwenye laha ya hesabu iliyokuwa imepitwa na wakati. Sasa tarehe ya mwisho, nyaraka na mahali maombi yangu yalipo ziko kwenye ukurasa mmoja, na nimeacha kufanya kazi kwa kumbukumbu.",
        "Huchapisha wito mara moja na tunaweza kuona kila maombi dhidi ya vigezo vile vile. Watathminiaji hawatumii tena alama kwa barua pepe, na tunaweza kujibu swali la mwombaji bila kutafuta mnyororo wa mazungumzo.",
        "Ninapewa maombi mahususi, si kuombwa kuyatafuta. Alama zangu ziko dhidi ya vigezo vilivyochapishwa, hivyo uamuzi ninaochangia unaweza kuelezewa kwa mtu yeyote anayeuliza.",
      ],
    },

    impact: {
      description:
        "Mabadiliko matano, kwa mpangilio yanavyotokea. Kila moja ni dai kuhusu jinsi jukwaa linavyofanya kazi, si kipimo cha jinsi linavyofanya kazi vizuri, na ndilo aina pekee ya dai inayopatikana kabla ya kuzinduliwa.",
      details: [
        "Tangazo ambalo lingepuuzwa kwenye sanduku la barua pepe lililojaa sasa linapatikana kwa kichujio na arifa ya tarehe ya mwisho.",
        "Mradi uliojengwa kwa vigezo halisi kabla ya tarehe ya mwisho, badala ya kuandikwa saa 23:00 usiku mmoja kabla.",
        "Maamuzi ya ufadhili na awamu za malipo yamerekodiwa mahali ambapo pande zote zinaweza kusoma, si kusawazishwa kutoka barua pepe.",
        "Shughuli na viashiria hupitiwa kwa ratiba, wakati mradi bado unaendelea na bado unaweza kurekebishwa.",
        "Wamiliki wa miradi na taasisi za ufadhili wanafanya kazi kwa kumbukumbu moja badala ya kubadilishana matoleo.",
      ],
    },

    pricing: {
      roleDetails: [
        "Sajili taasisi yako, chapisha matangazo, na simamia maombi unayopokea.",
        "Hutolewa na mfadhili au msimamizi. Pitia maombi yaliyopewa dhidi ya vigezo vilivyochapishwa.",
        "Usimamizi wa jukwaa: uhakiki, utoaji wa majukumu na usimamizi wa shughuli.",
      ],
    },

    faq: {
      description:
        "Maswali kumi na mawili yanayoamua kama jukwaa lina manufaa, yamejibiwa bila lugha ya matangazo. Pale ambapo jibu la kweli ni kwamba kitu bado hakijajengwa, ndivyo inavyosema.",
      a: {
        q1: "Aina mbili za matangazo: fursa za ufadhili, ambazo hutoa fedha dhidi ya mradi, na wito wa miradi, ambao hualika mapendekezo. Kila tangazo hubeba sekta, mahali, muhtasari wa ustahili, nyaraka zinazohitajika na tarehe ya mwisho. Sehemu ya ugunduzi huchuja aina zote mbili ili uweze kupunguza faharasa kabla ya kuanza kusoma.",
        q2: "Kila tangazo huonyesha hali, na kichujio hukuruhusu kuweka faharasa kwenye wito wazi pekee. Tarehe ya mwisho inaonekana kwenye kadi na kwenye maelezo ya tangazo, na arifa zinaweza kupangwa kwa kila mtumiaji ili tarehe ya mwisho isiwe kitu unachopaswa kukumbuka.",
        q3: "Kumbukumbu ya mradi yenye malengo, bajeti na nyaraka zake, pamoja na chochote wito mahususi unaohitaji. Kwa sababu nyaraka huambatishwa kwenye mradi badala ya maombi, mradi ulioandaliwa mara moja unaweza kuwasilishwa kwa wito kadhaa bila kupakia chochote tena. Msaidizi wa AI ataorodhesha nyaraka ambazo wito unahitaji.",
        q4: "Maombi hubeba hali na historia badala ya bendera moja ya kuwasilishwa au kutokwasilishwa, hivyo unaweza kuona hatua ambayo yamefika. Kama maombi yaliyowasilishwa bado yanaweza kuhaririwa inategemea sheria za wito wenyewe, ambazo zimeelezwa kwenye tangazo lake; jukwaa huonyesha hatua, halipuuzi sera ya mfadhili.",
        q5: "Kiasi cha kutosha kutathminiwa: mradi utafanya nini, kwa nani, kwa kipindi gani, kwa gharama gani, na utajuaje kwamba ulifanikiwa. Mradi huundwa kabla ya kuomba wito, ambayo inamaanisha unaweza kujiandaa kwa vigezo halisi badala ya kuandika kwa tarehe ya mwisho.",
        q6: "Ufadhili uliotolewa huambatishwa kwenye mradi pamoja na ratiba ya awamu. Kila awamu hurekodiwa inapotolewa, hivyo mwombaji anaweza kuona kilichoidhinishwa, kilichofika na kinachofuata. Jukwaa hurekodi ratiba na maendeleo yake; halijawa taasisi ya kifedha yenyewe.",
        q7: "Nyaraka ambazo mradi au wito unahitaji — vyeti vya usajili, mipango ya kazi, bajeti, madokezo ya dhana, sera. Kila faili hupangwa kwa kategoria na hubeba hali ya mapitio, na inaonekana kwa wahusika walioambatishwa kwenye mradi huo badala ya kuchapishwa hadharani. Nyaraka huhifadhiwa kwenye kumbukumbu ya mradi ili zibaki nayo kwa maisha yote ya mradi.",
        q8: "Kwa vigezo vilivyoainishwa, huku kila mtathminiaji akipewa maombi mahususi na kila alama hurekodiwa dhidi ya kazi aliyopewa. Uamuzi wa uteuzi huhifadhiwa kwenye maombi, na ndicho kinachofanya matokeo kuelezeka kwa mwombaji anayeuliza. Jukwaa haliamui chochote yenyewe; hurekodi vigezo, alama na uamuzi.",
        q9: "Malipo hurekodiwa dhidi ya awamu, hivyo awamu inaweza kusawazishwa kadri kazi inavyotekelekwa badala ya kama jumla moja mwishoni. Mtoaji wa ufadhili na mmiliki wa mradi wote wanaona kumbukumbu ile ile, jambo linaloondoa usawazishaji unaotokea kwa kawaida kwa barua pepe mwishoni mwa kipindi cha taarifa.",
        q10: "Hueleza tangazo, hufupisha vigezo vya ustahili kuwa orodha ya ukaguzi, huorodhesha nyaraka zinazohitajika, hurahisisha maandishi manene, hutafsiri maelezo na hukuongoza katika hatua inayofuata ya maombi. Hayaamui ufadhili, hayachagui waombaji, na hayatoi uamuzi wa mwisho wa ustahili. Maamuzi hayo ni ya watu wanaoendesha wito.",
        q11: "Kiingereza, Kifaransa, Kirundi na Kiswahili. Kichagua kiko kwenye menyu ya urambazaji na chaguo huhifadhiwa kwenye kifaa hiki, na pia huweka sifa ya lugha ya ukurasa ili visomaji vya skrini na tafsiri ya kivinjari vifanye kazi vizuri. Kiolesura na maudhui ya ukurasa vimetafsiriwa katika lugha zote nne; maandishi ya tangazo lenyewe hubaki katika lugha iliyoandikwa.",
        q12: "Kuingia hubadilisha vitambulisho vyako kwa tokeni ya ufikiaji ya muda mfupi badala ya kipindi kilichohifadhiwa, na jukwaa limejengwa na majukumu ya taasisi, mtathminiaji na msimamizi. Nyaraka zinahusishwa na mradi badala ya kuwa za umma. Tahadhari mbili za kweli: utekelezaji wa majukumu bado unaunganishwa kwenye madaraja ya ruhusa ya API, na kutoka kwa sasa husafisha tokeni kwenye kifaa hiki pekee, kwa sababu API bado haina kituo cha kubatilisha.",
      },
    },

    finalCta: {
      details: [
        "Pitia faharasa ya matangazo yaliyo wazi, yaliyochujwa kwa sekta, mahali na tarehe ya mwisho.",
        "Fungua akaunti ili kujenga mradi na kuweka nyaraka zake mahali pamoja.",
        "Sajili taasisi ili kuchapisha wito na kusimamia maombi unayopokea.",
      ],
      note: "Matangazo, miradi na maombi yanayoonekana kwenye ukurasa huu ni kumbukumbu za mfano. Lugha nne za kiolesura zinafanya kazi, na maudhui ya ukurasa yametafsiriwa pamoja nazo.",
    },

    opps: {
      sectors: {
        climate: "Hali ya hewa na mazingira",
        education: "Elimu",
        entrepreneurship: "Ujasiriamali",
        health: "Afya",
        digital: "Ujumuishaji wa kidijitali",
        governance: "Utawala",
      },
      locations: {
        burundiRegional: "Burundi, kikanda",
        eastAfrica: "Afrika Mashariki",
        regional: "Kikanda",
        burundiNational: "Burundi, kitaifa",
        subSaharanAfrica: "Afrika Kusini mwa Sahara",
        centralAfrica: "Afrika ya Kati",
      },
      places: {
        burundi: "Burundi",
      },
      items: {
        resilienceGrants: {
          title: "Ruzuku za ustahimilivu wa jamii",
          provider: "Mtoaji wa ufadhili wa mfano",
          amount: "USD 12,000 - 60,000",
          summary:
            "Husaidia kazi za kukabiliana na mabadiliko zinazoongozwa na wenyeji — maji, udongo, tahadhari za mapema na ustahimilivu wa kaya — zinazotekelezwa na taasisi zilizo katika eneo lengwa.",
          eligibility: [
            "Taasisi iliyosajiliwa au kikundi kilichosajiliwa",
            "Angalau mwaka mmoja wa shughuli",
            "Shughuli zinazotekelezwa katika eneo lengwa",
          ],
          documents: ["Cheti cha usajili", "Mpango wa kazi uliosainiwa", "Bajeti"],
        },
        learningCommunities: {
          title: "Wito wa jamii za kujifunza",
          provider: "Sekretarieti ya programu ya mfano",
          amount: "Bajeti ya mradi hadi USD 40,000",
          summary:
            "Wito wa mapendekezo yanayojenga miundo endelevu ya kujifunza ya jamii: vilabu vya shule, vikundi vya kusoma vya jamii na mitandao ya kusoma na kuandika ya watu wazima.",
          eligibility: [
            "Taasisi ya elimu au ya vijana",
            "Rekodi ya utekelezaji ngazi ya jamii",
            "Mpango unaofunika angalau miezi 12",
          ],
          documents: ["Dokezo la dhana", "Chati ya taasisi", "Sera ya ulinzi"],
        },
        youthEnterprise: {
          title: "Usaidizi wa biashara zinazoongozwa na vijana",
          provider: "Mshirika wa mfuko wa mfano",
          amount: "USD 5,000 - 25,000",
          summary:
            "Mtaji wa kufanyia kazi na ushauri kwa waanzilishi vijana, kwa kipaumbele cha biashara zinazozalisha ajira za eneo.",
          eligibility: [
            "Mwaanzilishi mwenye umri wa miaka 18-35",
            "Biashara iliyosajiliwa",
            "Biashara inayofanya kazi chini ya miezi 24",
          ],
          documents: ["Usajili wa biashara", "Makadirio ya mtiririko wa fedha", "Wasifu wa mwaanzilishi"],
        },
        maternalHealth: {
          title: "Programu ya afya ya uzazi ya jamii",
          provider: "Ushirikiano wa afya wa mfano",
          amount: "Bajeti ya programu, miaka mingi",
          summary:
            "Washirika wa utekelezaji wanatafutwa kwa ajili ya afya ya uzazi inayotegemea jamii, ikiwemo njia za rufaa na mafunzo ya ukunga.",
          eligibility: [
            "Taasisi isiyo ya kiserikali ya afya au kituo kilichoidhinishwa",
            "Utawala wa kliniki uliopo",
            "Uzoefu katika mkoa lengwa",
          ],
          documents: ["Uidhinishaji", "Itifaki ya kliniki", "Mfumo wa ufuatiliaji"],
        },
        digitalAccess: {
          title: "Ruzuku za ufikiaji wa kidijitali vijijini",
          provider: "Mfuko wa teknolojia wa mfano",
          amount: "USD 20,000 - 90,000",
          summary:
            "Vifaa, muunganisho wa mtandao na mafunzo kwa jamii za vijijini, kikipa kipaumbele mifumo ya ufikiaji wa pamoja badala ya kugawa kifaa kwa kila mtu.",
          eligibility: [
            "Taasisi isiyo ya faida au ya sekta ya umma",
            "Ushirikiano na chombo cha jamii cha eneo",
            "Mpango wa uendelevu wa miaka mitatu",
          ],
          documents: ["Dokezo la dhana", "Barua za ushirikiano", "Mpango wa uendelevu"],
        },
        governanceCivics: {
          title: "Elimu ya uraia na utawala wa eneo",
          provider: "Taasisi ya kiraia ya mfano",
          amount: "Ruzuku hadi USD 30,000",
          summary:
            "Miradi ya elimu ya uraia inayojenga uelewa wa umma kuhusu serikali za eneo, bajeti za umma na haki za wananchi.",
          eligibility: [
            "Taasisi ya jamii ya kiraia",
            "Ushahidi wa kuwezesha jamii",
            "Programu isiyo na itikadi ya chama",
          ],
          documents: ["Dokezo la dhana", "Mpango wa shughuli", "Wasifu wa wawezeshaji"],
        },
      },
    },

    api: {
      unreachable:
        "Imeshindwa kufikia API. Angalia muunganisho wako na uhakikishe seva za frontend na Django zinafanya kazi.",
      unreachableShort:
        "Imeshindwa kufikia API. Hakikisha seva za frontend na Django zinafanya kazi.",
      requestFailed: "Seva imeshindwa kukamilisha ombi lako. Tafadhali jaribu tena.",
      accountLoadFailed: "Maelezo ya akaunti yako hayakuweza kupakiwa.",
    },

    session: {
      browserOnly: "Kipindi cha kuingia kinaweza kuhifadhiwa kwenye kivinjari pekee.",
      tokensMissing: "Jibu la kuingia halikujumuisha tokeni zote mbili.",
      saveFailed:
        "Kivinjari chako kimeshindwa kuhifadhi kipindi cha kuingia. Ruhusu hifadhi ya tovuti na ujaribu tena.",
      loginRequired: "Tafadhali ingia ili kuendelea.",
      expiredInactive:
        "Kipindi chako kiliisha baada ya dakika 60 bila shughuli. Tafadhali ingia tena.",
      renewUnreachable:
        "Imeshindwa kuhuisha kipindi kwa sababu API haipatikani. Tafadhali jaribu tena.",
      changed: "Kipindi cha kuingia kimebadilika. Tafadhali jaribu tena.",
      expired: "Kipindi chako cha kuingia kimeisha. Tafadhali ingia tena.",
      renewFailed: "Seva imeshindwa kuhuisha kipindi chako. Tafadhali jaribu tena.",
      invalidRenewal: "Seva imerudisha jibu batili la kuhuisha kipindi.",
      saveRenewedFailed: "Kivinjari chako kimeshindwa kuhifadhi kipindi kilichohuishwa.",
      noRefreshToken:
        "Hakuna tokeni ya kuhuisha inayopatikana. Unaweza kusafisha kipindi cha kivinjari hiki badala yake.",
      logoutFailed:
        "Kutoka kwa akaunti upande wa seva hakukukamilika. Tafadhali jaribu tena au safisha kipindi cha kivinjari hiki.",
      logoutFailedBare: "Kutoka kwa akaunti upande wa seva hakukukamilika.",
    },
  },
};
