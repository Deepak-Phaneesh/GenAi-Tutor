/**
 * CURRICULUM_DATABASE
 * A rule-based fallback system for content generation.
 * This ensures the platform works even when AI APIs are down or rate-limited.
 */

export const CURRICULUM_DATABASE = {
    "python": {
        title: "Python Mastery Path",
        description: "Official structured path for learning Python from scratch.",
        path: [
            {
                title: "Fundamentals of Python",
                days: [
                    {
                        topic: "Introduction & Setup",
                        duration: "1 hour",
                        explanation: "Python is a high-level, interpreted programming language renowned for its elegant syntax and readability. It emphasizes code clarity, allowing developers to express concepts in fewer lines of code compared to other languages like C++ or Java.\\n\\nUnderstanding the core setup is the first critical step in your journey as a Python developer. You will begin by installing the Python interpreter, which translates your code into machine-readable instructions. Following this, configuring a robust Integrated Development Environment (IDE) such as Visual Studio Code provides syntax highlighting, debugging capabilities, and intelligent code completion, significantly enhancing your productivity and workflow efficiency.\\n\\nOnce the environment is successfully configured, the interactive Read-Eval-Print Loop (REPL) allows you to experiment with code snippets dynamically and immediately see the results, serving as an invaluable tool for continuous testing and learning.",
                        key_concepts: ["Interpreter", "Syntax", "REPL"],
                        example: "print('Hello, Python!')",
                        practice_task: "Install Python and run your first print statement.",
                        resources: ["https://docs.python.org/3/tutorial/interpreter.html"]
                    },
                    {
                        topic: "Variables & Data Types",
                        duration: "1.5 hours",
                        explanation: "In software engineering, variables act as fundamental, dynamically allocated memory containers that store mutable data for subsequent processing. Python is dynamically typed, meaning you do not need to explicitly declare an identifier's type; the interpreter inherently assigns it at runtime based on the assigned value.\\n\\nThe foundational primitive data types include integers (whole numbers), floating-point numbers (decimals), strings (textual sequences), and booleans (true/false logical states). Mastering these primitives, along with understanding how the interpreter categorizes data, is an absolute prerequisite for building structurally sound applications.\\n\\nAdditionally, it is crucial to understand type-casting, which allows you to programmatically convert standard data structures from one definitive type to another, enabling robust arithmetic and string concatenation algorithms when managing distinct variable states.",
                        key_concepts: ["int", "float", "str", "bool", "type casting"],
                        example: "name = 'AI'\\nage = 5\\nis_smart = True",
                        practice_task: "Create variables for your name, age, and a boolean expressing if you like coding.",
                        resources: ["https://www.w3schools.com/python/python_variables.asp"]
                    },
                    {
                        topic: "Control Flow (If-Else)",
                        duration: "2 hours",
                        explanation: "Control flow architecture dictates the conditional execution order of individual statements, functions, or algorithmic blocks based on programmatic runtime evaluations. Implementing logical condition branches enables applications to make sophisticated choices and respond dynamically to user input or shifting data states.\\n\\nPython utilizes fundamental boolean logic evaluated through 'if', 'elif', and 'else' branching keywords to orchestrate these conditional matrices. These mechanisms, when combined with logical conjunctions and comparative operators mapping equality, inequality, and magnitude, formulate the underlying decision-engine of any modern application.\\n\\nA properly architected conditional tree streamlines your business logic and dramatically reduces the necessary code overhead, optimizing execution pathways and guaranteeing predictable, edge-case-resistant operations.",
                        key_concepts: ["if", "elif", "else", "comparison operators"],
                        example: "if age > 18:\\n    print('Adult')\\nelse:\\n    print('Minor')",
                        practice_task: "Write a program that checks if a number is positive, negative, or zero.",
                        resources: ["https://realpython.com/python-conditional-statements/"]
                    },
                    {
                        topic: "Loops (For & While)",
                        duration: "2 hours",
                        explanation: "Iteration mechanics, or looping primitives, are utilized to repetitively execute isolated blocks of imperative code without forcing the developer to linearly rewrite that logic. Python offers two core iterative loops: 'for' loops, which gracefully iterate over explicitly defined sequences or designated enumerables, and 'while' loops, which continuously trigger as long as an evaluated boolean condition maintains a 'true' classification.\\n\\nUnderstanding how to effectively control iteration cycles via built-in constructs like 'range()', or manipulate the loop state via 'break' and 'continue' constraints, facilitates efficient parsing across enormous arrays of database records or collections. Mastering these sequential operations drastically curtails redundancy.\\n\\nPoorly structured looping architectures, however, can introduce catastrophic infinite loops or sub-optimal algorithmic time-complexities. Thus, optimizing loop logic and leveraging generator-based iteration is a professional milestone for backend engineers.",
                        key_concepts: ["for", "while", "range", "break", "continue"],
                        example: "for i in range(5):\\n    print(i)",
                        practice_task: "Print all even numbers from 1 to 20 using a for loop.",
                        resources: ["https://www.geeksforgeeks.org/python-loops/"]
                    },
                    {
                        topic: "Lists & Dictionaries",
                        duration: "2.5 hours",
                        explanation: "High-level algorithms absolutely mandate scalable frameworks to structure, store, and manipulate grouped informational records. Python facilitates this through highly optimized, built-in data structure types, most notably standard Lists and Dictionaries.\\n\\nLists function as sequential, numerically indexed arrays that excel at preserving linear order and handling homogeneous matrices perfectly. In contrast, Dictionaries implement a highly performant hash map architecture mapping localized, immutable identity keys uniformly directly onto related value datasets, providing near-instant O(1) retrieval.\\n\\nProficiency with mutating collections—understanding how to securely append variables, slice sub-structures, structurally nest layers recursively, or access key-value associations algorithmically—establishes the absolute backbone upon which professional RESTful JSON parsing and software scaling rely.",
                        key_concepts: ["List", "Dictionary", "Index", "Key-Value"],
                        example: "fruits = ['apple', 'banana']\\nuser = {'name': 'John', 'id': 1}",
                        practice_task: "Create a list of 5 colors and print the 3rd one.",
                        resources: ["https://docs.python.org/3/tutorial/datastructures.html"]
                    },
                    {
                        topic: "Functions & Scope",
                        duration: "2 hours",
                        explanation: "Functions encompass block-oriented, self-contained architectures encapsulating defined subsets of deterministic logic under uniquely identifiable developer-labeled signatures. Encapsulating code blocks through declarative functionality prevents architectural monolithic decay, inherently promoting systemic testing, reusability, and clean decoupling across a scaled codebase.\\n\\nFunctions programmatically accommodate standardized parametric ingestion (arguments) and programmatically output predictable execution responses (returns). Comprehending the variable lifecycle boundary models—colloquially termed variable object scope—ensures local temporary mutations do not erroneously overwrite systemic global states, a prevalent source of logical bugs natively.\\n\\nStructuring your engineering workflow securely around composable functional paradigms constitutes a quintessential hallmark marking the transition from an amateur scripter into an architecturally sound software engineer capable of maintaining extensive repositories.",
                        key_concepts: ["def", "parameters", "return", "global vs local"],
                        example: "def greet(name):\\n    return f'Hello {name}'",
                        practice_task: "Define a function that takes two numbers and returns their sum.",
                        resources: ["https://www.w3schools.com/python/python_functions.asp"]
                    }
                ]
            }
        ],
        exam: [
            { text: "Which keyword is used to define a function in Python?", options: ["func", "define", "def", "function"], answerIndex: 2 },
            { text: "What is the output of print(type([]) )?", options: ["<class 'list'>", "<class 'dict'>", "<class 'array'>", "<class 'tuple'>"], answerIndex: 0 },
            { text: "How do you start a for loop in Python?", options: ["for x in y:", "for(i=0;i<10;i++)", "foreach x in y", "loop x over y"], answerIndex: 0 },
            { text: "Which operator is used for exponentiation?", options: ["^", "**", "//", "exp"], answerIndex: 1 },
            { text: "What is the extension of Python files?", options: [".py", ".python", ".pty", ".px"], answerIndex: 0 }
        ]
    },
    "javascript": {
        title: "Modern JavaScript Journey",
        description: "The complete roadmap to becoming a JavaScript developer.",
        path: [
            {
                title: "JavaScript Core",
                days: [
                    {
                        topic: "Introduction to JS & Console",
                        duration: "1 hour",
                        explanation: "JavaScript represents the foundational runtime scripting terminology propelling dynamically active web ecosystems currently globally. Initiated solely as a lightweight frontend scripting interface acting directly inside the user's browser runtime engine, JavaScript has systematically evolved into a monolithic entity extending into deep server-side paradigms via Node.js architectures.\\n\\nMastering the internal execution cycle and browser runtime environment mechanisms establishes your baseline comprehension, opening pathways toward complex single-page-application compilation. An absolutely pivotal foundational tool remains the universally accessible browser Developer Console, enabling sequential debugging tracing and programmatic variable logic inspection immediately available natively.\\n\\nUnderstanding how basic standard console statements interface programmatically with real-time interpretation environments drastically minimizes architectural overhead initially, cementing logical testing patterns early before advanced framework integrations abstract direct rendering visibility operations.",
                        key_concepts: ["Console", "Execution", "Scripts"],
                        example: "console.log('Hello World');",
                        practice_task: "Open your browser console and run alert('Hi').",
                        resources: ["https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/JavaScript_basics"]
                    },
                    {
                        topic: "Variables: let, const & var",
                        duration: "1 hour",
                        explanation: "A robust engineering understanding mandates fundamentally mapping memory allocation paradigms managing runtime storage, executed uniquely via standard JavaScript variable keyword declarations. Historically, the globally hoisting 'var' specification established mutable properties, however modern ES6 paradigm architecture decisively standardizes strictly-scoped implementations leveraging 'let' and 'const' primitive models.\\n\\nIntegrating standard 'const' semantics heavily implicitly locks structural immutability securing functional reference variables heavily decreasing subsequent debugging overhead while explicitly scoping primitive mutability deliberately through controlled 'let' reassignments predictably isolating block scopes successfully.\\n\\nComprehending strict lexical scoping prevents logical overriding collision bugs occurring typically during complex closure-dependent function logic, enforcing safe module structures securely across massive software production pipelines and team-based engineering configurations actively.",
                        key_concepts: ["Scope", "Hoisting", "Immutability"],
                        example: "const pi = 3.14;\\nlet score = 10;",
                        practice_task: "Declare a constant for your birthday and a let variable for your favorite food.",
                        resources: ["https://javascript.info/variables"]
                    },
                    {
                        topic: "Arrow Functions & ES6",
                        duration: "2 hours",
                        explanation: "The systemic architectural overhaul introduced via the ES6 ECMAScript standard specification revolutionized standard functional syntax patterns comprehensively streamlining implementation drastically natively. The newly integrated arrow function methodology successfully optimizes traditionally bloated function declarations down into concise logic-forward syntactic statements eliminating unnecessary boilerplate parameters natively.\\n\\nCritically imperative, arrow implementations behaviorally inherit their binding lexical 'this' property context securely dynamically from enclosing exterior operational parent scopes statically circumventing confusing standard contextual object binding failures inherently endemic historically across classical vanilla JavaScript operations completely safely.\\n\\nCoupling syntactically concise arrow expressions alongside incredibly powerful modern ES6 implementations encompassing array destructuring operators or intelligent temporal template literals solidifies sophisticated logic construction techniques rendering code architectures notably legible concisely rapidly naturally.",
                        key_concepts: ["Template Literals", "Arrow Syntax", "Destructuring"],
                        example: "const add = (a, b) => a + b;",
                        practice_task: "Convert a standard function to an arrow function.",
                        resources: ["https://www.w3schools.com/js/js_es6.asp"]
                    },
                    {
                        topic: "DOM Manipulation",
                        duration: "3 hours",
                        explanation: "The unified Document Object Model (DOM) paradigm functions exclusively bridging critical programmatic interface connectivity connecting executed isolated static HTML structures structurally directly linked to programmatic runtime interactive scripting seamlessly natively. Advanced user interface development solely fundamentally mandates mastery comprehending standardized systemic node-based interface operational traversal dynamically generating interactive client responsiveness intelligently.\\n\\nJavaScript execution intrinsically empowers frontend runtime environment controllers functionally granting complete administrative rights altering cascading stylesheets sequentially editing semantic content securely responding automatically dynamically capturing client behavioral events natively registering sequential inputs robustly continuously dynamically.\\n\\nExecuting sophisticated operations sequentially targeting explicitly unique identification markers utilizing native standardized query capabilities intelligently rendering visual interactive models constructs comprehensively optimized professional architectural implementations fundamentally necessary successfully integrating advanced component-driven web frameworks smoothly logically.",
                        key_concepts: ["querySelector", "addEventListener", "innerHTML"],
                        example: "document.getElementById('btn').click();",
                        practice_task: "Create a button that changes the page background color when clicked.",
                        resources: ["https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction"]
                    },
                    {
                        topic: "Promises & Async/Await",
                        duration: "3 hours",
                        explanation: "Synchronous logic blocking inevitably critically paralyzes high-performance interface ecosystems completely rendering UI interactions completely unresponsive systematically handling external operational requests statically independently. Modern production JavaScript inherently circumvents blocking behaviors strategically implementing fundamentally non-blocking asynchronous event-loop operational concurrency sequentially predictably logically processing extensive external network HTTP payload pipelines reliably completely efficiently.\\n\\nThe standardized syntactical transition upgrading legacy foundational chained prototype callback architectural matrices naturally upgrading toward modernized sophisticated declarative Promises inherently constructs robust operational reliability guaranteeing specific sequentially predictable logic execution flows perfectly continuously successfully handling runtime operational resolutions explicitly managing failures dynamically capturing exceptions safely comprehensively.\\n\\nMastering synchronous-appearing syntactic operational formatting employing intelligent 'async' implementation controllers pairing explicitly asynchronous 'await' declarative executions constructs robustly exceptionally readable network HTTP parsing algorithms successfully fundamentally modeling modern advanced client-side framework data operations safely effectively practically continuously.",
                        key_concepts: ["fetch", "async", "await", "then/catch"],
                        example: "const data = await fetch(url).then(r => r.json());",
                        practice_task: "Fetch users from 'https://jsonplaceholder.typicode.com/users' and log them.",
                        resources: ["https://javascript.info/async"]
                    },
                    {
                        topic: "Array Methods (Map/Filter)",
                        duration: "2 hours",
                        explanation: "Modern robust software implementations completely aggressively emphasize strict declarative functional programming schemas standardizing logic heavily explicitly shifting programmatic iteration paradigms dramatically permanently moving away syntactically universally discarding archaic linear loop structures generally completely universally fundamentally permanently securely effectively. Built-in specialized array operational standardizations fundamentally construct high-level logic executing immutably predictably systematically successfully successfully processing complex dynamically linked metadata architectures efficiently safely systematically logically naturally seamlessly.\\n\\nNative prototype 'map' capabilities algorithmically mathematically elegantly deterministically systematically sequentially dynamically transforming massive sequential index schemas deterministically continuously converting arrays safely functionally effortlessly generating updated identical structures efficiently completely reliably systematically flawlessly universally perfectly cleanly.\\n\\nImplementation prototype 'filter' structurally sequentially programmatically cleanly executes strict logical conditional expressions intelligently generating explicitly precise conditionally verified datasets logically processing parameters smoothly securely fundamentally modeling architectural core database processing techniques explicitly logically rendering dynamic UI state components properly clearly accurately completely robustly dependably properly.",
                        key_concepts: ["map", "filter", "reduce", "forEach"],
                        example: "const double = [1,2].map(x => x * 2);",
                        practice_task: "Filter a list of numbers to keep only those greater than 10.",
                        resources: ["https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map"]
                    }
                ]
            }
        ],
        exam: [
            { text: "Which company developed JavaScript?", options: ["Netscape", "Microsoft", "Google", "Facebook"], answerIndex: 0 },
            { text: "How do you declare a constant variable?", options: ["var", "let", "const", "constant"], answerIndex: 2 },
            { text: "Which operator checks for both value and type equality?", options: ["==", "=", "===", "!="], answerIndex: 2 },
            { text: "What does DOM stand for?", options: ["Document Object Model", "Data Object Module", "Digital Online Multiplier", "Document Origin Map"], answerIndex: 0 },
            { text: "Which method is used to select an element by ID?", options: ["querySelector", "getElementById", "select", "find"], answerIndex: 1 }
        ]
    }
};

export const getFallbackPath = (skill, weeks) => {
    const key = skill.toLowerCase();

    // 1. Direct match
    let template = CURRICULUM_DATABASE[key];

    // 2. Fuzzy match for programming languages only
    if (!template) {
        const match = Object.keys(CURRICULUM_DATABASE).find(k =>
            key.includes(k) || k.includes(key) || (k === 'javascript' && key.includes('js'))
        );
        // Only use a programming template if it actually matches — never default to Python for non-programming skills
        template = match ? CURRICULUM_DATABASE[match] : null;
    }

    const weeksCount = parseInt(weeks, 10);
    const finalPath = [];

    if (template) {
        // Use the matched programming template
        for (let i = 0; i < weeksCount; i++) {
            finalPath.push({
                title: `${template.path[0].title} - Part ${i + 1}`,
                days: [...template.path[0].days]
            });
        }
        return { path: finalPath, exam: template.exam };
    }

    // 3. Generic fallback for any non-programming skill (languages, business, etc.)
    const capitalSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
    const genericDays = [
        { topic: `Introduction to ${capitalSkill}`, duration: '1 hour', explanation: `Gaining a robust initial understanding of ${capitalSkill} fundamentally anchors your comprehensive journey seamlessly sequentially enabling highly precise strategic implementations globally accurately dynamically.\\n\\nEffectively analyzing operational implementations structurally naturally clarifies explicitly targeted foundational benchmarks standardizing logical procedures optimizing operational performance metrics logically predictably systematically cleanly successfully properly completely dynamically safely.\\n\\nStructurally investigating standardized components logically effectively universally dramatically expands sequential knowledge processing dynamically completely safely naturally systematically resolving developmental boundaries exceptionally effectively effortlessly comprehensively intelligently completely natively precisely systematically naturally.`, key_concepts: ['Overview', 'Goals', 'Structure'], practice_task: `Research what ${capitalSkill} is used for and write a short summary.` },
        { topic: `Core Fundamentals`, duration: '1.5 hours', explanation: `Mastering foundational architectural building blocks fundamentally categorically secures advanced operational stability seamlessly consistently explicitly naturally generating scalable implementation schemas programmatically mathematically dynamically continuously securely logically perfectly properly.\\n\\nTheoretically establishing functional principles dramatically critically streamlines logically systematically inherently optimizing process integrations algorithmically categorically resolving typical workflow disruptions predictably systematically cleanly universally dynamically dependably naturally completely flawlessly effectively.\\n\\nRecognizing explicit terminology dynamically logically naturally effortlessly empowers systematic engineering communication completely explicitly intelligently dramatically sequentially comprehensively constructing standardized operational processes naturally practically seamlessly successfully securely completely dependably expertly professionally dynamically effortlessly.`, key_concepts: ['Basics', 'Principles', 'Terminology'], practice_task: `List 5 key terms related to ${capitalSkill} and write a one-sentence definition for each.` },
        { topic: `Practical Application`, duration: '2 hours', explanation: `Syntactically directly actively implementing functional prototypes logically categorically physically dynamically establishes exceptionally comprehensive algorithmic retention dramatically consistently inherently standardizing development workflows systematically perfectly cleanly naturally professionally expertly safely naturally.\\n\\nEmpirically investigating practical real-world architecture definitively predictably intuitively seamlessly validates experimental theoretical foundations dynamically generating functional verifiable outcomes inherently algorithmically processing components properly systematically intelligently perfectly seamlessly naturally dynamically completely safely effectively.\\n\\nSystematically evaluating empirical metrics structurally organically effectively intuitively accelerates advanced skill acquisition dynamically conclusively universally clearly cleanly generating exceptional robust engineering results naturally correctly logically physically comprehensively securely intuitively beautifully predictably intuitively.`, key_concepts: ['Application', 'Practice', 'Examples'], practice_task: `Find a real-world example of ${capitalSkill} in use and describe how the concepts apply.` },
        { topic: `Intermediate Concepts`, duration: '2 hours', explanation: `Expanding conceptual architectures progressively cleanly naturally explicitly transitions foundational processing systematically effectively universally intelligently mapping highly structurally dense matrix components properly completely dependably seamlessly flawlessly natively.\\n\\nAnalytically defining systematic abstraction layers physically inherently strategically significantly streamlines algorithmic workflow integration dynamically inherently mathematically expertly standardizing project specifications conclusively smoothly actively completely intuitively dependably beautifully seamlessly safely practically seamlessly.\\n\\nStructurally dissecting complex multi-level architectures definitively explicitly categorically effortlessly generates comprehensive nuanced systematic understanding predictably intuitively naturally dynamically generating intelligent optimization patterns actively sequentially smoothly successfully dynamically logically accurately comprehensively expertly intelligently expertly effortlessly.`, key_concepts: ['Intermediate level', 'Depth', 'Analysis'], practice_task: `Compare two different approaches or methods within ${capitalSkill}.` },
        { topic: `Common Challenges`, duration: '1.5 hours', explanation: `Strategically auditing conventional engineering bottlenecks explicitly organically conclusively dynamically guarantees predictive robust programmatic continuity seamlessly intelligently naturally cleanly systematically identifying operational risks decisively thoroughly structurally effectively completely.\\n\\nIntelligently formulating algorithmic mitigation strategies naturally categorically physically sequentially inherently optimally accelerates developmental throughput cleanly dramatically functionally continuously completely actively inherently flawlessly generating exceptional systematic architecture securely gracefully securely fully smoothly dependably correctly completely intuitively naturally.\\n\\nProgrammatically debugging syntactical procedural anomalies proactively systematically gracefully definitively successfully significantly dramatically improves architectural operational functionality fully actively dependably seamlessly clearly comprehensively elegantly properly thoroughly intuitively structurally perfectly fundamentally flawlessly organically practically.`, key_concepts: ['Challenges', 'Problem solving', 'Strategy'], practice_task: `Identify one challenge you have faced when learning ${capitalSkill} and describe how you would solve it.` },
        { topic: `Advanced Topics & Best Practices`, duration: '2 hours', explanation: `Systematically implementing standardized engineering logic definitively accurately systematically categorically consistently completely maximizes structural algorithm execution dynamically reliably effectively conclusively naturally efficiently smoothly expertly fully efficiently seamlessly flawlessly optimally perfectly brilliantly naturally.\\n\\nHistorically mastering complex professional architectural schemas natively intuitively fundamentally seamlessly universally physically clearly establishes authoritative robust operational excellence dynamically functionally natively dynamically producing elite fully mature components automatically actively inherently beautifully consistently fundamentally systematically organically effortlessly definitively smoothly.\\n\\nAggressively incorporating verified optimization techniques functionally completely significantly definitively dramatically fully universally elevates programmatic processing efficiently mathematically systematically continuously expertly solidly functionally structurally effectively correctly practically organically beautifully smoothly confidently fully logically cleanly brilliantly elegantly expertly.`, key_concepts: ['Advanced', 'Best Practices', 'Mastery'], practice_task: `Read one expert article or resource about ${capitalSkill} and summarize its key takeaways.` },
    ];

    for (let i = 0; i < weeksCount; i++) {
        finalPath.push({
            week: i + 1,
            title: `${capitalSkill} Mastery — Week ${i + 1}`,
            days: genericDays.map((d, idx) => ({ day: idx + 1, ...d }))
        });
    }

    const genericExam = [
        { text: `What is the primary focus of ${capitalSkill}?`, options: ['Theory and concepts', 'Practical application', 'Both theory and practice', 'Neither'], answerIndex: 2 },
        { text: `Which approach is most effective for learning ${capitalSkill}?`, options: ['Memorization only', 'Practice and application', 'Reading textbooks only', 'Watching videos only'], answerIndex: 1 },
        { text: `What is a key benefit of mastering ${capitalSkill}?`, options: ['Limited career options', 'Improved problem-solving', 'Reduced opportunities', 'No benefit'], answerIndex: 1 },
        { text: `How should a beginner start learning ${capitalSkill}?`, options: ['Jump to advanced topics', 'Start with fundamentals', 'Skip to projects', 'Read research papers'], answerIndex: 1 },
        { text: `What does consistent practice of ${capitalSkill} lead to?`, options: ['Stagnation', 'Skill deterioration', 'Gradual mastery', 'No improvement'], answerIndex: 2 },
    ];

    return { path: finalPath, exam: genericExam };
};

export const getFallbackAssessment = (skill) => {
    const key = skill.toLowerCase();

    // 1. Direct match
    let template = CURRICULUM_DATABASE[key];

    // 2. Fuzzy match for programming skills only
    if (!template) {
        const match = Object.keys(CURRICULUM_DATABASE).find(k =>
            key.includes(k) || k.includes(key) || (k === 'javascript' && key.includes('js'))
        );
        template = match ? CURRICULUM_DATABASE[match] : null;
    }

    if (template) {
        const mcqs = template.exam.map(q => ({
            type: 'mcq',
            text: q.text,
            options: q.options,
            answerIndex: q.answerIndex
        }));
        return mcqs;
    }

    // Generic assessment for non-programming skills
    const capitalSkill = skill.charAt(0).toUpperCase() + skill.slice(1);
    return [
        { type: 'mcq', text: `What is the primary focus of ${capitalSkill}?`, options: ['Theory and concepts', 'Practical application', 'Both theory and practice', 'Neither'], answerIndex: 2 },
        { type: 'mcq', text: `Which approach is most effective for learning ${capitalSkill}?`, options: ['Memorization only', 'Practice and application', 'Reading books only', 'Watching videos only'], answerIndex: 1 },
        { type: 'mcq', text: `What is a key benefit of mastering ${capitalSkill}?`, options: ['Limited career options', 'Improved communication', 'Reduced opportunities', 'No benefit'], answerIndex: 1 },
        { type: 'mcq', text: `How should a beginner start learning ${capitalSkill}?`, options: ['Jump to advanced topics', 'Start with fundamentals', 'Skip to complex projects', 'Read research papers'], answerIndex: 1 },
        { type: 'mcq', text: `What does regular practice of ${capitalSkill} lead to?`, options: ['Stagnation', 'Skill deterioration', 'Gradual improvement', 'No change'], answerIndex: 2 },
    ];
};
