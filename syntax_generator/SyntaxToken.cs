namespace LanguageCore.SyntaxGenerator;

static partial class Program
{
    static class SyntaxToken
    {
        public static readonly Pattern Comment = new() { Name = "comment" };
        public static readonly Pattern CommentBlock = new() { Name = "comment.block" };
        public static readonly Pattern CommentBlockDocumentation = new() { Name = "comment.block.documentation" };
        public static readonly Pattern CommentLine = new() { Name = "comment.line" };
        public static readonly Pattern CommentLineDoubleDash = new() { Name = "comment.line.double-dash" };
        public static readonly Pattern CommentLineDoubleSlash = new() { Name = "comment.line.double-slash" };
        public static readonly Pattern CommentLineNumberSign = new() { Name = "comment.line.number-sign" };
        public static readonly Pattern CommentLinePercentage = new() { Name = "comment.line.percentage" };
        public static readonly Pattern Constant = new() { Name = "constant" };
        public static readonly Pattern ConstantCharacter = new() { Name = "constant.character" };
        public static readonly Pattern ConstantCharacterEscape = new() { Name = "constant.character.escape" };
        public static readonly Pattern ConstantLanguage = new() { Name = "constant.language" };
        public static readonly Pattern ConstantNumeric = new() { Name = "constant.numeric" };
        public static readonly Pattern ConstantOther = new() { Name = "constant.other" };
        public static readonly Pattern ConstantRegexp = new() { Name = "constant.regexp" };
        public static readonly Pattern ConstantRgbValue = new() { Name = "constant.rgb-value" };
        public static readonly Pattern ConstantShaGitRebase = new() { Name = "constant.sha.git-rebase" };
        public static readonly Pattern Emphasis = new() { Name = "emphasis" };
        public static readonly Pattern Entity = new() { Name = "entity" };
        public static readonly Pattern EntityName = new() { Name = "entity.name" };
        public static readonly Pattern EntityNameClass = new() { Name = "entity.name.class" };
        public static readonly Pattern EntityNameFunction = new() { Name = "entity.name.function" };
        public static readonly Pattern EntityNameMethod = new() { Name = "entity.name.method" };
        public static readonly Pattern EntityNameSection = new() { Name = "entity.name.section" };
        public static readonly Pattern EntityNameSelector = new() { Name = "entity.name.selector" };
        public static readonly Pattern EntityNameTag = new() { Name = "entity.name.tag" };
        public static readonly Pattern EntityNameType = new() { Name = "entity.name.type" };
        public static readonly Pattern EntityNameVariable = new() { Name = "entity.name.variable" };
        public static readonly Pattern EntityOther = new() { Name = "entity.other" };
        public static readonly Pattern EntityOtherAttributeName = new() { Name = "entity.other.attribute-name" };
        public static readonly Pattern EntityOtherInheritedClass = new() { Name = "entity.other.inherited-class" };
        public static readonly Pattern Header = new() { Name = "header" };
        public static readonly Pattern Invalid = new() { Name = "invalid" };
        public static readonly Pattern InvalidDeprecated = new() { Name = "invalid.deprecated" };
        public static readonly Pattern InvalidIllegal = new() { Name = "invalid.illegal" };
        public static readonly Pattern Keyword = new() { Name = "keyword" };
        public static readonly Pattern KeywordControl = new() { Name = "keyword.control" };
        public static readonly Pattern KeywordControlLess = new() { Name = "keyword.control.less" };
        public static readonly Pattern KeywordOperator = new() { Name = "keyword.operator" };
        public static readonly Pattern KeywordOperatorNew = new() { Name = "keyword.operator.new" };
        public static readonly Pattern KeywordOther = new() { Name = "keyword.other" };
        public static readonly Pattern KeywordOtherUnit = new() { Name = "keyword.other.unit" };
        public static readonly Pattern Markup = new() { Name = "markup" };
        public static readonly Pattern MarkupBold = new() { Name = "markup.bold" };
        public static readonly Pattern MarkupChanged = new() { Name = "markup.changed" };
        public static readonly Pattern MarkupDeleted = new() { Name = "markup.deleted" };
        public static readonly Pattern MarkupHeading = new() { Name = "markup.heading" };
        public static readonly Pattern MarkupInlineRaw = new() { Name = "markup.inline.raw" };
        public static readonly Pattern MarkupInserted = new() { Name = "markup.inserted" };
        public static readonly Pattern MarkupItalic = new() { Name = "markup.italic" };
        public static readonly Pattern MarkupList = new() { Name = "markup.list" };
        public static readonly Pattern MarkupListNumbered = new() { Name = "markup.list.numbered" };
        public static readonly Pattern MarkupListNnnumbered = new() { Name = "markup.list.unnumbered" };
        public static readonly Pattern MarkupOther = new() { Name = "markup.other" };
        public static readonly Pattern MarkupPunctuationListBeginning = new() { Name = "markup.punctuation.list.beginning" };
        public static readonly Pattern MarkupPunctuationQuoteBeginning = new() { Name = "markup.punctuation.quote.beginning" };
        public static readonly Pattern MarkupQuote = new() { Name = "markup.quote" };
        public static readonly Pattern MarkupRaw = new() { Name = "markup.raw" };
        public static readonly Pattern MarkupUnderline = new() { Name = "markup.underline" };
        public static readonly Pattern MarkupUnderlineLink = new() { Name = "markup.underline.link" };
        public static readonly Pattern Meta = new() { Name = "meta" };
        public static readonly Pattern MetaCast = new() { Name = "meta.cast" };
        public static readonly Pattern MetaParameterTypeVariable = new() { Name = "meta.parameter.type.variable" };
        public static readonly Pattern MetaPreprocessor = new() { Name = "meta.preprocessor" };
        public static readonly Pattern MetaPreprocessorNumeric = new() { Name = "meta.preprocessor.numeric" };
        public static readonly Pattern MetaPreprocessorString = new() { Name = "meta.preprocessor.string" };
        public static readonly Pattern MetaReturnType = new() { Name = "meta.return-type" };
        public static readonly Pattern MetaSelector = new() { Name = "meta.selector" };
        public static readonly Pattern MetaStructureDictionaryKeyPython = new() { Name = "meta.structure.dictionary.key.python" };
        public static readonly Pattern MetaTag = new() { Name = "meta.tag" };
        public static readonly Pattern MetaTypeAnnotation = new() { Name = "meta.type.annotation" };
        public static readonly Pattern MetaTypeName = new() { Name = "meta.type.name" };
        public static readonly Pattern MetatagPhp = new() { Name = "metatag.php" };
        public static readonly Pattern Storage = new() { Name = "storage" };
        public static readonly Pattern StorageModifier = new() { Name = "storage.modifier" };
        public static readonly Pattern StorageModifierImportJava = new() { Name = "storage.modifier.import.java" };
        public static readonly Pattern StorageModifierPackageJava = new() { Name = "storage.modifier.package.java" };
        public static readonly Pattern StorageType = new() { Name = "storage.type" };
        public static readonly Pattern StorageTypeCs = new() { Name = "storage.type.cs" };
        public static readonly Pattern StorageTypeJava = new() { Name = "storage.type.java" };
        public static readonly Pattern String = new() { Name = "string" };
        public static readonly Pattern StringHtml = new() { Name = "string.html" };
        public static readonly Pattern StringInterpolated = new() { Name = "string.interpolated" };
        public static readonly Pattern StringJade = new() { Name = "string.jade" };
        public static readonly Pattern StringOther = new() { Name = "string.other" };
        public static readonly Pattern StringQuoted = new() { Name = "string.quoted" };
        public static readonly Pattern StringQuotedDouble = new() { Name = "string.quoted.double" };
        public static readonly Pattern StringQuotedOther = new() { Name = "string.quoted.other" };
        public static readonly Pattern StringQuotedSingle = new() { Name = "string.quoted.single" };
        public static readonly Pattern StringQuotedTriple = new() { Name = "string.quoted.triple" };
        public static readonly Pattern StringRegexp = new() { Name = "string.regexp" };
        public static readonly Pattern StringUnquoted = new() { Name = "string.unquoted" };
        public static readonly Pattern StringXml = new() { Name = "string.xml" };
        public static readonly Pattern StringYaml = new() { Name = "string.yaml" };
        public static readonly Pattern Strong = new() { Name = "strong" };
        public static readonly Pattern Support = new() { Name = "support" };
        public static readonly Pattern SupportClass = new() { Name = "support.class" };
        public static readonly Pattern SupportConstant = new() { Name = "support.constant" };
        public static readonly Pattern SupportFunction = new() { Name = "support.function" };
        public static readonly Pattern SupportFunctionGitRebase = new() { Name = "support.function.git-rebase" };
        public static readonly Pattern SupportOther = new() { Name = "support.other" };
        public static readonly Pattern SupportPropertyValue = new() { Name = "support.property-value" };
        public static readonly Pattern SupportType = new() { Name = "support.type" };
        public static readonly Pattern SupportTypePropertyName = new() { Name = "support.type.property-name" };
        public static readonly Pattern SupportTypePropertyNameCss = new() { Name = "support.type.property-name.css" };
        public static readonly Pattern SupportTypePropertyNameLess = new() { Name = "support.type.property-name.less" };
        public static readonly Pattern SupportTypePropertyNameCcss = new() { Name = "support.type.property-name.scss" };
        public static readonly Pattern SupportVariable = new() { Name = "support.variable" };
        public static readonly Pattern Variable = new() { Name = "variable" };
        public static readonly Pattern VariableLanguage = new() { Name = "variable.language" };
        public static readonly Pattern VariableName = new() { Name = "variable.name" };
        public static readonly Pattern VariableOther = new() { Name = "variable.other" };
        public static readonly Pattern VariableParameter = new() { Name = "variable.parameter" };
    }
}
