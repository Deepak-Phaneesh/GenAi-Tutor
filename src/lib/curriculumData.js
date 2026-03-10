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
                        explanation: "Python is a high-level, interpreted language known for its readability. Setup involves installing the Python interpreter and an IDE like VS Code.",
                        key_concepts: ["Interpreter", "Syntax", "REPL"],
                        example: "print('Hello, Python!')",
                        practice_task: "Install Python and run your first print statement.",
                        resources: ["https://docs.python.org/3/tutorial/interpreter.html"]
                    },
                    {
                        topic: "Variables & Data Types",
                        duration: "1.5 hours",
                        explanation: "Variables store data. Python has scales like integers, floats, strings, and booleans.",
                        key_concepts: ["int", "float", "str", "bool", "type casting"],
                        example: "name = 'AI'\nage = 5\nis_smart = True",
                        practice_task: "Create variables for your name, age, and a boolean expressing if you like coding.",
                        resources: ["https://www.w3schools.com/python/python_variables.asp"]
                    },
                    {
                        topic: "Control Flow (If-Else)",
                        duration: "2 hours",
                        explanation: "Control flow allows the program to make decisions based on conditions.",
                        key_concepts: ["if", "elif", "else", "comparison operators"],
                        example: "if age > 18:\n    print('Adult')\nelse:\n    print('Minor')",
                        practice_task: "Write a program that checks if a number is positive, negative, or zero.",
                        resources: ["https://realpython.com/python-conditional-statements/"]
                    },
                    {
                        topic: "Loops (For & While)",
                        duration: "2 hours",
                        explanation: "Loops repeat a block of code multiple times.",
                        key_concepts: ["for", "while", "range", "break", "continue"],
                        example: "for i in range(5):\n    print(i)",
                        practice_task: "Print all even numbers from 1 to 20 using a for loop.",
                        resources: ["https://www.geeksforgeeks.org/python-loops/"]
                    },
                    {
                        topic: "Lists & Dictionaries",
                        duration: "2.5 hours",
                        explanation: "Data structures allow storing collections of items.",
                        key_concepts: ["List", "Dictionary", "Index", "Key-Value"],
                        example: "fruits = ['apple', 'banana']\nuser = {'name': 'John', 'id': 1}",
                        practice_task: "Create a list of 5 colors and print the 3rd one.",
                        resources: ["https://docs.python.org/3/tutorial/datastructures.html"]
                    },
                    {
                        topic: "Functions & Scope",
                        duration: "2 hours",
                        explanation: "Functions help reuse code and organize logic into reusable blocks.",
                        key_concepts: ["def", "parameters", "return", "global vs local"],
                        example: "def greet(name):\n    return f'Hello {name}'",
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
                        explanation: "JS is the language of the web. It runs in the browser and on servers via Node.js.",
                        key_concepts: ["Console", "Execution", "Scripts"],
                        example: "console.log('Hello World');",
                        practice_task: "Open your browser console and run alert('Hi').",
                        resources: ["https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/JavaScript_basics"]
                    },
                    {
                        topic: "Variables: let, const & var",
                        duration: "1 hour",
                        explanation: "Modern JS uses let and const for block-scoped variables.",
                        key_concepts: ["Scope", "Hoisting", "Immutability"],
                        example: "const pi = 3.14;\nlet score = 10;",
                        practice_task: "Declare a constant for your birthday and a let variable for your favorite food.",
                        resources: ["https://javascript.info/variables"]
                    },
                    {
                        topic: "Arrow Functions & ES6",
                        duration: "2 hours",
                        explanation: "Arrow functions provide a shorter syntax and handle 'this' differently.",
                        key_concepts: ["Template Literals", "Arrow Syntax", "Destructuring"],
                        example: "const add = (a, b) => a + b;",
                        practice_task: "Convert a standard function to an arrow function.",
                        resources: ["https://www.w3schools.com/js/js_es6.asp"]
                    },
                    {
                        topic: "DOM Manipulation",
                        duration: "3 hours",
                        explanation: "The DOM allows JS to change HTML and CSS dynamically.",
                        key_concepts: ["querySelector", "addEventListener", "innerHTML"],
                        example: "document.getElementById('btn').click();",
                        practice_task: "Create a button that changes the page background color when clicked.",
                        resources: ["https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction"]
                    },
                    {
                        topic: "Promises & Async/Await",
                        duration: "3 hours",
                        explanation: "Handling async operations like API calls using Promises.",
                        key_concepts: ["fetch", "async", "await", "then/catch"],
                        example: "const data = await fetch(url).then(r => r.json());",
                        practice_task: "Fetch users from 'https://jsonplaceholder.typicode.com/users' and log them.",
                        resources: ["https://javascript.info/async"]
                    },
                    {
                        topic: "Array Methods (Map/Filter)",
                        duration: "2 hours",
                        explanation: "Functional programming tools for array manipulation.",
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

    // 2. Fuzzy match
    if (!template) {
        const match = Object.keys(CURRICULUM_DATABASE).find(k =>
            key.includes(k) || k.includes(key) || (k === 'javascript' && key.includes('js'))
        );
        template = match ? CURRICULUM_DATABASE[match] : CURRICULUM_DATABASE["python"];
    }

    // Multiply the path based on weeks if needed (simple cloning for demo)
    const weeksCount = parseInt(weeks, 10);
    const finalPath = [];

    for (let i = 0; i < weeksCount; i++) {
        finalPath.push({
            title: `${template.path[0].title} - Part ${i + 1}`,
            days: [...template.path[0].days] // In real app, we'd have unique content for all weeks
        });
    }

    return {
        path: finalPath,
        exam: template.exam
    };
};

export const getFallbackAssessment = (skill) => {
    const key = skill.toLowerCase();

    // 1. Direct match
    let template = CURRICULUM_DATABASE[key];

    // 2. Fuzzy match
    if (!template) {
        const match = Object.keys(CURRICULUM_DATABASE).find(k =>
            key.includes(k) || k.includes(key) || (k === 'javascript' && key.includes('js'))
        );
        template = match ? CURRICULUM_DATABASE[match] : CURRICULUM_DATABASE["python"];
    }

    // Convert MCQ format to match the state expects
    const mcqs = template.exam.map(q => ({
        type: 'mcq',
        text: q.text,
        options: q.options,
        answerIndex: q.answerIndex
    }));

    // Add generic coding questions
    const coding = [
        { type: 'coding', text: `Write a small program in ${skill} that demonstrates the concept of Loops.` },
        { type: 'coding', text: `Implement a function that validates a user's input string for minimum length.` }
    ];

    return [...mcqs, ...coding];
};
