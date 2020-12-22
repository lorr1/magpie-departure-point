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

// Every experiment should start with an intro view. Here you can welcome your participants and tell them what the experiment is about
const intro = magpieViews.view_generator("intro", {
    trials: 1,
    name: 'intro',
    // If you use JavaScripts Template String `I am a Template String`, you can use HTML <></> and javascript ${} inside
    text: `This is a sample introduction view.
            <br />
            <br />
            The introduction view welcomes the participant and gives general information
            about the experiment. You are in the <strong>${coin}</strong> group.
            <br />
            <br />
            This is a minimal experiment with one forced choice view. It can serve as a starting point for programming your own experiment.`,
    buttonText: 'begin the experiment'
});

// For most tasks, you need instructions views
const instructions = magpieViews.view_generator("instructions", {
    trials: 1,
    name: 'instructions',
    title: 'General Instructions',
    text: ` <div class="my-magpie-view-text">
            <div>We're collecting data for linking mentions in text to their Wikipedia entities (every Wikipedia article is an entity). Given the mention highlighted
            in the text passage, your goal is to pick the Wikipedia entity that most closely matches the mention. </div>
               
            <h3>Choosing an Entity</h3>
            Pick the most fine-grained entity. For example, for the sentence
            
            <p style="text-align:center"><b>"David Beckham played football for England."</b></p>
            
            you will be shown multiple choices for the word "England", such as
            <ul> 
            <li>England (country)</li>
            <li>England (association footlball)</li>
            <li>NA</li>
            </ul>
            Here, you should pick&nbsp; <span style="font-family: Consolas,monospace">England (association football)</span>, not 
            &nbsp;<span style="font-family: Consolas,monospace">England (country)</span> since from context, we know
            that David Beckham plays for the England football team. 
            
            
            <h2>The None of the Above option</h2>
            Don't be afraid to pick NA (none of the above) option. For example, in the sentence 
            <p style="text-align:center"><b>"David Beckham played for Milan."</b></p>
            
            suppose you are shown the following choices for the mention "Milan",
            <ul> 
            <li>Milan, Italy</li>
            <li>University of Milan</li>
            <li>NA</li>
            </ul>
            Here, you should pick "NA" since no other option accurately matches the entity.
            
            
            <h2>Keyboard Shortcuts</h2>
            Our interface can be used entirely with a keyboard. You can use your number keys (0-9) to select options, 
            and then press Enter to confirm your selection and move on to the next labeling task. 
            
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
    title: 'Additional information',
    text: 'Answering the following questions is optional, but your answers will help us analyze our results.'

    // You can change much of what appears here, e.g., to present it in a different language, as follows:
    // buttonText: 'Weiter',
    // age_question: 'Alter',
    // gender_question: 'Geschlecht',
    // gender_male: 'männlich',
    // gender_female: 'weiblich',
    // gender_other: 'divers',
    // edu_question: 'Höchster Bildungsabschluss',
    // edu_graduated_high_school: 'Abitur',
    // edu_graduated_college: 'Hochschulabschluss',
    // edu_higher_degree: 'Universitärer Abschluss',
    // languages_question: 'Muttersprache',
    // languages_more: '(in der Regel die Sprache, die Sie als Kind zu Hause gesprochen haben)',
    // comments_question: 'Weitere Kommentare'
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

// Here, we initialize a normal forced_choice view
const entity_choice = custom_entity_choice_doc({
    // This will use all trials specified in `data`, you can user a smaller value (for testing), but not a larger value
    trials: 2,
    // name should be identical to the variable name
    name: 'entity_choice',
    data: ned_info,
    isGoldExample: false,
    // you can add custom functions at different stages through a view's life cycle
    // hook: {
    //     after_response_enabled: check_response
    // }
    mousetracking: {
        autostart: true,
        rate: 50
    }
});

const entity_choice_gld = custom_entity_choice_doc({
    // This will use all trials specified in `data`, you can user a smaller value (for testing), but not a larger value
    trials: 1,
    // name should be identical to the variable name
    name: 'entity_choice_gld',
    data: ned_info_gld,
    isGoldExample: true,
});

// There are many more templates available:
// forced_choice, slider_rating, dropdown_choice, testbox_input, rating_scale, image_selection, sentence_choice,
// key_press, self_paced_reading and self_paced_reading_rating_scale
