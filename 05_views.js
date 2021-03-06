// In this file you can instantiate your views
// We here first instantiate wrapping views, then the trial views


/** Wrapping views below

 * Obligatory properties

 * trials: int - the number of trials this view will appear
 * name: string

 *Optional properties
 * buttonText: string - the text on the button (default: 'next')
 * text: string - the text to be displayed in this view
 * title: string - the title of this view

 * More about the properties and functions of the wrapping views - https://magpie-ea.github.io/magpie-docs/01_designing_experiments/01_template_views/#wrapping-views

 */
const screening = custom_screening({
    // This will use all trials specified in `data`, you can user a smaller value (for testing), but not a larger value
    trials: 1,
    title: 'Answer Question to Begin (you have 3 tries)',
    // name should be identical to the variable name
    name: 'screening',
    data: screening_info,

});

// For most tasks, you need instructions views
const instructions = magpieViews.view_generator("instructions", {
    trials: 1,
    name: 'instructions',
    title: 'General Instructions',
    text: ` <div class="my-magpie-view-text">
            Thank you for participating in our task! We're collecting data for linking mentions in text to their Wikipedia entities. 
            In this setting, every Wikipedia article is an entity, so we are linking words to their corresponding Wikipedia articles.
            
            <p>For example, in the sentence</p>
            
            <p style="text-align:center"><b>"David Beckham played soccer"</b></p>
            
            the mention "David Beckham" is referring to the entity of the same name,&nbsp; <span style="font-family: Consolas,monospace">David Beckham</span>.
            Some sentences will be harder to resolve. For example, in the sentence
            
            <p style="text-align:center"><b>"The Manhattan is a very popular drink"</b></p>
            
            <p>the mention "Manhattan" refers to&nbsp; <span style="font-family: Consolas,monospace">Manhattan (cocktail)</span>, not&nbsp;
            <span style="font-family: Consolas,monospace">Manhattan (New York)</span>.</p>
            
            <h2>Task Description</h2>
            
            <p> The task starts with showing the entire passage you will be linking. You can read this if it helps provide context. You will then be shown
            sentences from that passage individually with highlighted mentions. For each mention, you will get up to 10 possible entities to choose from, including a
            "none of the above" option. Your goal is to pick the Wikipedia entity that most closely links to the mention from the choices.</p>
               
            <h2>Entity Guidelines</h2>
            If there are multiple choices that seem correct to you, try to choose the <em>most specific</em>. For example, for the sentence
            
            <p style="text-align:center"><b>"David Beckham played football for England."</b></p>
            
            you will be shown multiple choices for the word "England", such as
            <ul> 
            <li>England (country)</li>
            <li>England (association footlball)</li>
            <li>NA</li>
            </ul>
            Here, you should pick&nbsp; <span style="font-family: Consolas,monospace">England (association football)</span>, not 
            &nbsp;<span style="font-family: Consolas,monospace">England (country)</span> since we know
            that David Beckham plays for the England football team and the football team is a more specific entity than the country.
            
            
            <h2>The None of the Above Option</h2>
            You are <em>not</em> guaranteed to have the correct entity in the 10 options. The "none of the above" (NA) option is here for you to select
            that none of the above options are correct. Don't be afraid to pick the NA option. For example, in the sentence
             
            <p style="text-align:center"><b>"David Beckham played for Milan."</b></p>
            
            suppose you are shown the following choices for the mention "Milan",
            <ul> 
            <li>Milan, Italy</li>
            <li>University of Milan</li>
            <li>NA</li>
            </ul>
            Here, you should pick "NA" since no option accurately matches to the football team entity of&nbsp;<span style="font-family: Consolas,monospace">Milan F.C.</span>.
            
            <h2>Keyboard Shortcuts</h2>
            Our interface can be used entirely with a keyboard. You can use your number keys (0-9) to select options, and then press Enter to confirm your selection and move on to the next labeling task. 
            
            <h2>Questions & Concerns</h2>
            For any questions and concerns, please reach out to <a href="mailto:lorr1@cs.stanford.edu">lorr1@cs.stanford.edu</a> and we'll be happy to address them.
            </div>
            `,
    buttonText: 'go to trials'
});


// In the post test questionnaire you can ask your participants addtional questions
const post_test = magpieViews.view_generator("post_test", {
    trials: 1,
    name: 'post_test',
    title: 'Survey',
    text: 'Answering the following questions is optional, but your answers will help us analyze our results.',
    // You can change much of what appears here, e.g., to present it in a different language, as follows:
    buttonText: 'Proceed',
    languages_question: 'What languages do you speak',
    comments_question: 'Did you find the task too long? Too short? Did you have enough information to answer the question? Were there too many candidates to choose from? Any other comments?'
});

// The 'thanks' view is crucial; never delete it; it submits the results!
const thanks = magpieViews.view_generator("thanks", {
    trials: 1,
    name: 'thanks',
    title: 'Thank you for taking part in this experiment!',
    prolificConfirmText: 'Press the button'
});

/** trial (magpie's Trial Type Views) below

 * Obligatory properties

 - trials: int - the number of trials this view will appear
 - name: string - the name of the view type as it shall be known to _magpie (e.g. for use with a progress bar)
 and the name of the trial as you want it to appear in the submitted data
 - data: array - an array of trial objects

 * Optional properties

 - pause: number (in ms) - blank screen before the fixation point or stimulus show
 - fix_duration: number (in ms) - blank screen with fixation point in the middle
 - stim_duration: number (in ms) - for how long to have the stimulus on the screen
 More about trial life cycle - https://magpie-ea.github.io/magpie-docs/01_designing_experiments/04_lifecycles_hooks/

 - hook: object - option to hook and add custom functions to the view
 More about hooks - https://magpie-ea.github.io/magpie-docs/01_designing_experiments/04_lifecycles_hooks/

 * All about the properties of trial views
 * https://magpie-ea.github.io/magpie-docs/01_designing_experiments/01_template_views/#trial-views
 */
var normal_trials = 3;
var gold_trials = 1;
var total_trials = normal_trials + gold_trials;

// Here, we initialize a normal forced_choice view
const entity_choice = custom_entity_choice_doc({
    // This will use all trials specified in `data`, you can user a smaller value (for testing), but not a larger value
    trials: normal_trials,
    total_trials: total_trials, // used for progressbar
    // name should be identical to the variable name
    name: 'entity_choice',

    data: slice_mentions(ned_info, worker_rand_num),
    rand_worker_num: worker_rand_num,
    is_gold_example: false,
    // you can add custom functions at different stages through a view's life cycle
    // hook: {
    //     after_response_enabled: check_response
    // }
    // mousetracking: {
    //     autostart: true,
    //     rate: 50
    // }
});

const entity_choice_gld = custom_entity_choice_doc({
    // This will use all trials specified in `data`, you can user a smaller value (for testing), but not a larger value
    trials: gold_trials,
    total_trials: total_trials, // used for progressbar
    // name should be identical to the variable name
    name: 'entity_choice_gld',
    data: slice_mentions(ned_info_gld, worker_rand_num),
    rand_worker_num: worker_rand_num,
    is_gold_example: true,
});

// There are many more templates available:
// forced_choice, slider_rating, dropdown_choice, testbox_input, rating_scale, image_selection, sentence_choice,
// key_press, self_paced_reading and self_paced_reading_rating_scale
