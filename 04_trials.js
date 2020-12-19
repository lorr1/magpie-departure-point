// In this file you can specify the trial data for your experiment


const trial_info = {
    forced_choice: [
        {
            question: "What's on the bread?",
            picture: "images/question_mark_02.png",
            option1: 'jam',
            option2: 'ham',
            correct: 'jam'
        },
        {
            question: "What's the weather like?",
            picture: "images/weather.jpg",
            option1: "shiny",
            option2: "rainbow",
            correct: "shiny"
        }
    ]
};


const example_ned_info = {
    forced_choice: [
        {
            question: "What's the right entity?",
            sentence: "David and Victoria couldn't wait to be on QI.",
            spans: [[0, 4], [10, 17], [43, 44]],
            annotations: ['PERSON', 'PERSON', 'TV SHOW'],
            candidates: [
                [
                    ['Q123', 'David Beckham', 'DB is'],
                    ['Q234', 'David Mitchell', 'DM is'],
                    ['Q345', 'David Wallace', 'DW is']
                ],
                [
                    ['Q987', 'Victoria Beckham', 'VB is'],
                    ['Q876', 'Victoria Coren Mitchell', 'VCM is'],
                    ['Q765', 'Victoria Cross', 'VC is'],
                    ['Q654', 'Queen Victoria', 'QV is'],
                ],
                [
                    ['Q1010', 'Quite Interesting', 'QI is'],
                    ['Q3030', 'Qi', 'Qi is']
                ],
            ],
        }
    ]
};
